const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity, notify, getUserIdsByRole, paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { setAssetStatus } = require('./assets.routes');
const { upload } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

const SELECT_MAINT = `
  SELECT m.*, a.asset_tag, a.name AS asset_name, u.name AS raised_by_name
  FROM maintenance_requests m
  JOIN assets a ON a.id = m.asset_id
  JOIN users u ON u.id = m.raised_by
`;

// GET /api/maintenance
router.get('/', asyncHandler(async (req, res) => {
  const { status, assetId, priority } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (status) { clauses.push('m.status = ?'); params.push(status); }
  if (assetId) { clauses.push('m.asset_id = ?'); params.push(assetId); }
  if (priority) { clauses.push('m.priority = ?'); params.push(priority); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`${SELECT_MAINT} ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM maintenance_requests m ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// POST /api/maintenance — raise a request (any authenticated holder/employee)
router.post('/', upload.single('photo'), asyncHandler(async (req, res) => {
  const { assetId, issueDescription, priority } = req.body;
  if (!assetId || !issueDescription) throw new ApiError(400, 'assetId and issueDescription are required');

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (['RETIRED', 'DISPOSED'].includes(asset.status)) {
    throw new ApiError(400, `Asset is ${asset.status} and cannot have maintenance raised against it`);
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO maintenance_requests (id, asset_id, raised_by, issue_description, priority, photo_path, status)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`
  ).run(id, assetId, req.user.id, issueDescription, priority || 'MEDIUM', req.file ? req.file.filename : null);

  logActivity({ actorId: req.user.id, action: 'MAINTENANCE_REQUESTED', entityType: 'maintenance_request', entityId: id, details: { assetId } });

  const managerIds = getUserIdsByRole(['ASSET_MANAGER', 'ADMIN']);
  for (const userId of managerIds) {
    notify({
      userId, type: 'MAINTENANCE_REQUESTED', title: 'New maintenance request',
      message: `${asset.name} (${asset.asset_tag}) needs approval for repair.`, entityType: 'maintenance_request', entityId: id,
    });
  }

  res.status(201).json({ data: db.prepare(`${SELECT_MAINT} WHERE m.id = ?`).get(id) });
}));

// POST /api/maintenance/:id/decision — { decision: 'APPROVED' | 'REJECTED', rejectionReason? }
// Asset flips to UNDER_MAINTENANCE only on approval, before repair work starts.
router.post('/:id/decision', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const req_ = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(req.params.id);
  if (!req_) throw new ApiError(404, 'Maintenance request not found');
  if (req_.status !== 'PENDING') throw new ApiError(400, 'This request has already been decided');

  const { decision, rejectionReason } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ApiError(400, 'decision must be APPROVED or REJECTED');

  db.transaction(() => {
    if (decision === 'APPROVED') {
      db.prepare(
        `UPDATE maintenance_requests SET status = 'APPROVED', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).run(req.user.id, req.params.id);
      setAssetStatus(req_.asset_id, 'UNDER_MAINTENANCE', req.user.id, 'Maintenance approved');
    } else {
      db.prepare(
        `UPDATE maintenance_requests SET status = 'REJECTED', approved_by = ?, approved_at = datetime('now'), rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(req.user.id, rejectionReason || null, req.params.id);
    }
  })();

  logActivity({ actorId: req.user.id, action: `MAINTENANCE_${decision}`, entityType: 'maintenance_request', entityId: req.params.id });
  notify({
    userId: req_.raised_by, type: `MAINTENANCE_${decision}`, title: `Maintenance request ${decision.toLowerCase()}`,
    message: decision === 'APPROVED' ? 'Your maintenance request has been approved.' : `Request rejected: ${rejectionReason || 'no reason given'}`,
    entityType: 'maintenance_request', entityId: req.params.id,
  });

  res.json({ data: db.prepare(`${SELECT_MAINT} WHERE m.id = ?`).get(req.params.id) });
}));

// POST /api/maintenance/:id/assign-technician
router.post('/:id/assign-technician', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const item = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(req.params.id);
  if (!item) throw new ApiError(404, 'Maintenance request not found');
  if (item.status !== 'APPROVED') throw new ApiError(400, 'Request must be APPROVED before assigning a technician');

  const { technicianName } = req.body;
  if (!technicianName) throw new ApiError(400, 'technicianName is required');

  db.prepare(
    `UPDATE maintenance_requests SET status = 'TECHNICIAN_ASSIGNED', technician_name = ?, technician_assigned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(technicianName, req.params.id);

  logActivity({ actorId: req.user.id, action: 'TECHNICIAN_ASSIGNED', entityType: 'maintenance_request', entityId: req.params.id, details: { technicianName } });
  res.json({ data: db.prepare(`${SELECT_MAINT} WHERE m.id = ?`).get(req.params.id) });
}));

// POST /api/maintenance/:id/start — move to IN_PROGRESS
router.post('/:id/start', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const item = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(req.params.id);
  if (!item) throw new ApiError(404, 'Maintenance request not found');
  if (item.status !== 'TECHNICIAN_ASSIGNED') throw new ApiError(400, 'A technician must be assigned first');

  db.prepare(`UPDATE maintenance_requests SET status = 'IN_PROGRESS', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  logActivity({ actorId: req.user.id, action: 'MAINTENANCE_STARTED', entityType: 'maintenance_request', entityId: req.params.id });
  res.json({ data: db.prepare(`${SELECT_MAINT} WHERE m.id = ?`).get(req.params.id) });
}));

// POST /api/maintenance/:id/resolve — asset flips back to Available
router.post('/:id/resolve', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const item = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(req.params.id);
  if (!item) throw new ApiError(404, 'Maintenance request not found');
  if (!['IN_PROGRESS', 'TECHNICIAN_ASSIGNED'].includes(item.status)) {
    throw new ApiError(400, 'Request must be in progress before it can be resolved');
  }

  const { resolutionNotes, cost } = req.body;

  db.transaction(() => {
    db.prepare(
      `UPDATE maintenance_requests SET status = 'RESOLVED', resolved_at = datetime('now'), resolution_notes = ?, cost = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(resolutionNotes || null, cost ? Number(cost) : null, req.params.id);
    setAssetStatus(item.asset_id, 'AVAILABLE', req.user.id, 'Maintenance resolved');
  })();

  logActivity({ actorId: req.user.id, action: 'MAINTENANCE_RESOLVED', entityType: 'maintenance_request', entityId: req.params.id });
  notify({
    userId: item.raised_by, type: 'MAINTENANCE_RESOLVED', title: 'Maintenance resolved',
    message: 'The asset you reported is repaired and available again.', entityType: 'maintenance_request', entityId: req.params.id,
  });

  res.json({ data: db.prepare(`${SELECT_MAINT} WHERE m.id = ?`).get(req.params.id) });
}));

module.exports = router;
