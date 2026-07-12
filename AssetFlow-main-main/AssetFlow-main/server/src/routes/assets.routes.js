const express = require('express');
const { db } = require('../db');
const { uuid, nextAssetTag, ApiError, logActivity, paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { upload } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

// Legal lifecycle transitions. Most moves happen automatically via other modules
// (allocation, maintenance, audits); this map also allows explicit manual moves by managers.
const TRANSITIONS = {
  AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'],
  ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],
  RESERVED: ['AVAILABLE', 'ALLOCATED', 'UNDER_MAINTENANCE'],
  UNDER_MAINTENANCE: ['AVAILABLE', 'RETIRED', 'DISPOSED'],
  LOST: ['AVAILABLE', 'RETIRED'],
  RETIRED: ['DISPOSED'],
  DISPOSED: [],
};

function assertTransition(from, to) {
  if (from === to) return;
  if (!TRANSITIONS[from] || !TRANSITIONS[from].includes(to)) {
    throw new ApiError(400, `Cannot transition asset from ${from} to ${to}`);
  }
}

function setAssetStatus(assetId, toStatus, actorId, reason) {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  assertTransition(asset.status, toStatus);
  db.prepare(`UPDATE assets SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(toStatus, assetId);
  db.prepare(
    `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, reason, changed_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuid(), assetId, asset.status, toStatus, reason || null, actorId || null);
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
}

const SELECT_ASSET = `
  SELECT a.*, c.name AS category_name, d.name AS department_name
  FROM assets a
  LEFT JOIN asset_categories c ON c.id = a.category_id
  LEFT JOIN departments d ON d.id = a.department_id
`;

function attachExtras(asset) {
  asset.categoryFields = db.prepare(
    `SELECT cf.field_name, cf.field_type, v.value
     FROM category_fields cf
     LEFT JOIN asset_category_values v ON v.field_id = cf.id AND v.asset_id = ?
     WHERE cf.category_id = ?`
  ).all(asset.id, asset.category_id);
  asset.documents = db.prepare('SELECT * FROM asset_documents WHERE asset_id = ?').all(asset.id);
  return asset;
}

// GET /api/assets — search/filter by tag, serial, QR, category, status, department, location
router.get('/', asyncHandler(async (req, res) => {
  const { q, categoryId, status, departmentId, location, isBookable } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push('(a.asset_tag LIKE ? OR a.serial_number LIKE ? OR a.qr_code LIKE ? OR a.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (categoryId) { clauses.push('a.category_id = ?'); params.push(categoryId); }
  if (status) { clauses.push('a.status = ?'); params.push(status); }
  if (departmentId) { clauses.push('a.department_id = ?'); params.push(departmentId); }
  if (location) { clauses.push('a.location LIKE ?'); params.push(`%${location}%`); }
  if (isBookable !== undefined) { clauses.push('a.is_bookable = ?'); params.push(isBookable === 'true' ? 1 : 0); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`${SELECT_ASSET} ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM assets a ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// GET /api/assets/:id — includes lifecycle status + allocation/maintenance history
router.get('/:id', asyncHandler(async (req, res) => {
  const asset = db.prepare(`${SELECT_ASSET} WHERE a.id = ?`).get(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');
  attachExtras(asset);

  asset.allocationHistory = db.prepare(
    `SELECT al.*, u.name AS allocated_to_name, dep.name AS allocated_to_department_name
     FROM allocations al
     LEFT JOIN users u ON u.id = al.allocated_to_user_id
     LEFT JOIN departments dep ON dep.id = al.allocated_to_department_id
     WHERE al.asset_id = ? ORDER BY al.allocated_at DESC`
  ).all(req.params.id);

  asset.maintenanceHistory = db.prepare(
    `SELECT * FROM maintenance_requests WHERE asset_id = ? ORDER BY created_at DESC`
  ).all(req.params.id);

  asset.statusHistory = db.prepare(
    `SELECT * FROM asset_status_history WHERE asset_id = ? ORDER BY changed_at DESC`
  ).all(req.params.id);

  res.json({ data: asset });
}));

// POST /api/assets — register a new asset (Asset Manager / Admin)
router.post('/', requireRole('ADMIN', 'ASSET_MANAGER'), upload.single('photo'), asyncHandler(async (req, res) => {
  const {
    name, categoryId, serialNumber, qrCode, acquisitionDate, acquisitionCost,
    condition, location, departmentId, isBookable, notes, categoryFields,
  } = req.body;

  if (!name || !categoryId) throw new ApiError(400, 'name and categoryId are required');
  const category = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(categoryId);
  if (!category) throw new ApiError(400, 'Invalid categoryId');

  const id = uuid();
  const assetTag = nextAssetTag();
  const photoPath = req.file ? req.file.filename : null;

  db.prepare(
    `INSERT INTO assets (
       id, asset_tag, name, category_id, serial_number, qr_code, acquisition_date, acquisition_cost,
       condition, location, department_id, is_bookable, status, photo_path, notes, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?)`
  ).run(
    id, assetTag, name, categoryId, serialNumber || null, qrCode || null, acquisitionDate || null,
    acquisitionCost ? Number(acquisitionCost) : null, condition || 'GOOD', location || null,
    departmentId || null, isBookable === 'true' || isBookable === true ? 1 : 0, photoPath, notes || null, req.user.id
  );

  db.prepare(
    `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, reason, changed_by)
     VALUES (?, ?, NULL, 'AVAILABLE', 'Asset registered', ?)`
  ).run(uuid(), id, req.user.id);

  // Optional dynamic category field values, e.g. { "fieldId": "value" }
  if (categoryFields) {
    try {
      const parsed = typeof categoryFields === 'string' ? JSON.parse(categoryFields) : categoryFields;
      const insertVal = db.prepare(
        `INSERT INTO asset_category_values (id, asset_id, field_id, value) VALUES (?, ?, ?, ?)`
      );
      for (const [fieldId, value] of Object.entries(parsed)) {
        insertVal.run(uuid(), id, fieldId, String(value));
      }
    } catch { /* ignore malformed categoryFields payload */ }
  }

  logActivity({ actorId: req.user.id, action: 'ASSET_REGISTERED', entityType: 'asset', entityId: id, details: { assetTag, name } });
  res.status(201).json({ data: attachExtras(db.prepare(`${SELECT_ASSET} WHERE a.id = ?`).get(id)) });
}));

// PATCH /api/assets/:id — edit asset details (not status — use /status)
router.patch('/:id', requireRole('ADMIN', 'ASSET_MANAGER'), upload.single('photo'), asyncHandler(async (req, res) => {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const { name, serialNumber, qrCode, condition, location, departmentId, isBookable, notes } = req.body;
  const photoPath = req.file ? req.file.filename : asset.photo_path;

  db.prepare(
    `UPDATE assets SET
       name = COALESCE(?, name), serial_number = COALESCE(?, serial_number), qr_code = COALESCE(?, qr_code),
       condition = COALESCE(?, condition), location = COALESCE(?, location),
       department_id = ?, is_bookable = COALESCE(?, is_bookable), notes = COALESCE(?, notes),
       photo_path = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name || null, serialNumber || null, qrCode || null, condition || null, location || null,
    departmentId !== undefined ? departmentId : asset.department_id,
    isBookable !== undefined ? (isBookable === 'true' || isBookable === true ? 1 : 0) : null,
    notes ?? null, photoPath, req.params.id
  );

  logActivity({ actorId: req.user.id, action: 'ASSET_UPDATED', entityType: 'asset', entityId: req.params.id });
  res.json({ data: attachExtras(db.prepare(`${SELECT_ASSET} WHERE a.id = ?`).get(req.params.id)) });
}));

// POST /api/assets/:id/status — explicit manual lifecycle transition (e.g. mark Lost, Retire, Dispose)
router.post('/:id/status', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!status) throw new ApiError(400, 'status is required');
  const updated = setAssetStatus(req.params.id, status, req.user.id, reason);
  logActivity({ actorId: req.user.id, action: 'ASSET_STATUS_CHANGED', entityType: 'asset', entityId: req.params.id, details: { status } });
  res.json({ data: updated });
}));

module.exports = { router, setAssetStatus, assertTransition };
