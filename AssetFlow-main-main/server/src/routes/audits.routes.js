const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity, notify, paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { setAssetStatus } = require('./assets.routes');

const router = express.Router();
router.use(authenticate);

function attachAuditExtras(cycle) {
  cycle.auditors = db.prepare(
    `SELECT u.id, u.name, u.email FROM audit_auditors aa JOIN users u ON u.id = aa.user_id WHERE aa.audit_cycle_id = ?`
  ).all(cycle.id);
  cycle.items = db.prepare(
    `SELECT ai.*, a.asset_tag, a.name AS asset_name FROM audit_items ai JOIN assets a ON a.id = ai.asset_id WHERE ai.audit_cycle_id = ?`
  ).all(cycle.id);
  cycle.discrepancies = db.prepare(
    `SELECT d.*, a.asset_tag, a.name AS asset_name FROM audit_discrepancies d JOIN assets a ON a.id = d.asset_id WHERE d.audit_cycle_id = ?`
  ).all(cycle.id);
  return cycle;
}

// GET /api/audits
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const rows = db.prepare(`SELECT * FROM audit_cycles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_cycles ${where}`).get(...params).c;
  res.json({ data: rows.map(attachAuditExtras), page, limit, total });
}));

// GET /api/audits/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const cycle = db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  res.json({ data: attachAuditExtras(cycle) });
}));

// POST /api/audits — create a cycle with scope + auditors; auto-populates in-scope assets
router.post('/', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const { name, scopeDepartmentId, scopeLocation, startDate, endDate, auditorIds } = req.body;
  if (!name || !startDate || !endDate) throw new ApiError(400, 'name, startDate and endDate are required');
  if (!Array.isArray(auditorIds) || auditorIds.length === 0) throw new ApiError(400, 'At least one auditor must be assigned');

  const id = uuid();
  const result = db.transaction(() => {
    db.prepare(
      `INSERT INTO audit_cycles (id, name, scope_department_id, scope_location, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'PLANNED', ?)`
    ).run(id, name, scopeDepartmentId || null, scopeLocation || null, startDate, endDate, req.user.id);

    const insertAuditor = db.prepare(`INSERT INTO audit_auditors (id, audit_cycle_id, user_id) VALUES (?, ?, ?)`);
    for (const userId of auditorIds) insertAuditor.run(uuid(), id, userId);

    const clauses = [];
    const params = [];
    if (scopeDepartmentId) { clauses.push('department_id = ?'); params.push(scopeDepartmentId); }
    if (scopeLocation) { clauses.push('location LIKE ?'); params.push(`%${scopeLocation}%`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const inScopeAssets = db.prepare(`SELECT id FROM assets ${where}`).all(...params);

    const insertItem = db.prepare(`INSERT INTO audit_items (id, audit_cycle_id, asset_id) VALUES (?, ?, ?)`);
    for (const a of inScopeAssets) insertItem.run(uuid(), id, a.id);

    return db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(id);
  })();

  logActivity({ actorId: req.user.id, action: 'AUDIT_CYCLE_CREATED', entityType: 'audit_cycle', entityId: id, details: { name } });
  for (const userId of auditorIds) {
    notify({
      userId, type: 'AUDIT_ASSIGNED', title: 'You have been assigned as an auditor',
      message: `You're an auditor for the "${name}" audit cycle.`, entityType: 'audit_cycle', entityId: id,
    });
  }

  res.status(201).json({ data: attachAuditExtras(result) });
}));

// POST /api/audits/:id/start
router.post('/:id/start', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const cycle = db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  if (cycle.status !== 'PLANNED') throw new ApiError(400, 'Only a planned cycle can be started');
  db.prepare(`UPDATE audit_cycles SET status = 'IN_PROGRESS' WHERE id = ?`).run(req.params.id);
  logActivity({ actorId: req.user.id, action: 'AUDIT_CYCLE_STARTED', entityType: 'audit_cycle', entityId: req.params.id });
  res.json({ data: attachAuditExtras(db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id)) });
}));

// POST /api/audits/:id/items/:itemId/verify — auditor marks each asset Verified/Missing/Damaged
router.post('/:id/items/:itemId/verify', asyncHandler(async (req, res) => {
  const cycle = db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  if (cycle.status !== 'IN_PROGRESS') throw new ApiError(400, 'Audit cycle is not in progress');

  const isAuditor = db.prepare('SELECT 1 FROM audit_auditors WHERE audit_cycle_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!isAuditor && !['ADMIN', 'ASSET_MANAGER'].includes(req.user.role)) {
    throw new ApiError(403, 'Only assigned auditors can verify items in this cycle');
  }

  const item = db.prepare('SELECT * FROM audit_items WHERE id = ? AND audit_cycle_id = ?').get(req.params.itemId, req.params.id);
  if (!item) throw new ApiError(404, 'Audit item not found');

  const { result, notes } = req.body;
  if (!['VERIFIED', 'MISSING', 'DAMAGED'].includes(result)) throw new ApiError(400, 'result must be VERIFIED, MISSING or DAMAGED');

  db.transaction(() => {
    db.prepare(
      `UPDATE audit_items SET result = ?, notes = ?, checked_by = ?, checked_at = datetime('now') WHERE id = ?`
    ).run(result, notes || null, req.user.id, req.params.itemId);

    if (result === 'MISSING' || result === 'DAMAGED') {
      db.prepare(
        `INSERT INTO audit_discrepancies (id, audit_cycle_id, audit_item_id, asset_id, type, resolution_status)
         VALUES (?, ?, ?, ?, ?, 'OPEN')`
      ).run(uuid(), req.params.id, req.params.itemId, item.asset_id, result);
    }
  })();

  logActivity({ actorId: req.user.id, action: 'AUDIT_ITEM_VERIFIED', entityType: 'audit_item', entityId: req.params.itemId, details: { result } });
  res.json({ data: attachAuditExtras(db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id)) });
}));

// POST /api/audits/:id/close — locks the cycle; confirmed-missing items flip asset to LOST
router.post('/:id/close', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const cycle = db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found');
  if (cycle.status === 'CLOSED') throw new ApiError(400, 'Cycle is already closed');

  const unverified = db.prepare(
    `SELECT COUNT(*) AS c FROM audit_items WHERE audit_cycle_id = ? AND result IS NULL`
  ).get(req.params.id).c;
  if (unverified > 0 && !req.body.force) {
    throw new ApiError(400, `${unverified} item(s) are not yet verified. Pass force: true to close anyway.`);
  }

  db.transaction(() => {
    const missing = db.prepare(
      `SELECT asset_id FROM audit_items WHERE audit_cycle_id = ? AND result = 'MISSING'`
    ).all(req.params.id);
    for (const row of missing) {
      const asset = db.prepare('SELECT status FROM assets WHERE id = ?').get(row.asset_id);
      if (asset && asset.status !== 'LOST') {
        try { setAssetStatus(row.asset_id, 'LOST', req.user.id, `Confirmed missing in audit cycle ${cycle.name}`); }
        catch { /* skip illegal transitions, e.g. already retired/disposed */ }
      }
    }
    db.prepare(`UPDATE audit_cycles SET status = 'CLOSED', closed_by = ?, closed_at = datetime('now') WHERE id = ?`)
      .run(req.user.id, req.params.id);
  })();

  logActivity({ actorId: req.user.id, action: 'AUDIT_CYCLE_CLOSED', entityType: 'audit_cycle', entityId: req.params.id });
  res.json({ data: attachAuditExtras(db.prepare('SELECT * FROM audit_cycles WHERE id = ?').get(req.params.id)) });
}));

// POST /api/audits/discrepancies/:id/resolve
router.post('/discrepancies/:id/resolve', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const d = db.prepare('SELECT * FROM audit_discrepancies WHERE id = ?').get(req.params.id);
  if (!d) throw new ApiError(404, 'Discrepancy not found');
  db.prepare(
    `UPDATE audit_discrepancies SET resolution_status = 'RESOLVED', resolved_by = ?, resolved_at = datetime('now'), resolution_notes = ? WHERE id = ?`
  ).run(req.user.id, req.body.resolutionNotes || null, req.params.id);
  logActivity({ actorId: req.user.id, action: 'DISCREPANCY_RESOLVED', entityType: 'audit_discrepancy', entityId: req.params.id });
  res.json({ data: db.prepare('SELECT * FROM audit_discrepancies WHERE id = ?').get(req.params.id) });
}));

module.exports = router;
