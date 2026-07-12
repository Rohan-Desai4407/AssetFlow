const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity, paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

const SELECT_DEPT = `
  SELECT d.*, h.name AS head_name, p.name AS parent_name,
    (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.status = 'ACTIVE') AS employee_count,
    (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.id) AS asset_count
  FROM departments d
  LEFT JOIN users h ON h.id = d.head_user_id
  LEFT JOIN departments p ON p.id = d.parent_id
`;

// GET /api/departments
router.get('/', asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (status) { clauses.push('d.status = ?'); params.push(status); }
  if (search) { clauses.push('d.name LIKE ?'); params.push(`%${search}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`${SELECT_DEPT} ${where} ORDER BY d.name LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM departments d ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// GET /api/departments/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const row = db.prepare(`${SELECT_DEPT} WHERE d.id = ?`).get(req.params.id);
  if (!row) throw new ApiError(404, 'Department not found');
  res.json({ data: row });
}));

// POST /api/departments  (Admin only)
router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name, description, headUserId, parentId } = req.body;
  if (!name) throw new ApiError(400, 'name is required');

  if (headUserId) {
    const head = db.prepare('SELECT id FROM users WHERE id = ?').get(headUserId);
    if (!head) throw new ApiError(400, 'Invalid headUserId');
  }
  if (parentId) {
    const parent = db.prepare('SELECT id FROM departments WHERE id = ?').get(parentId);
    if (!parent) throw new ApiError(400, 'Invalid parentId');
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO departments (id, name, description, head_user_id, parent_id, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`
  ).run(id, name, description || null, headUserId || null, parentId || null);

  logActivity({ actorId: req.user.id, action: 'DEPARTMENT_CREATED', entityType: 'department', entityId: id, details: { name } });
  res.status(201).json({ data: db.prepare(`${SELECT_DEPT} WHERE d.id = ?`).get(id) });
}));

// PATCH /api/departments/:id  (Admin only)
router.patch('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found');

  const { name, description, headUserId, parentId, status } = req.body;
  if (parentId && parentId === req.params.id) throw new ApiError(400, 'A department cannot be its own parent');

  db.prepare(
    `UPDATE departments SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       head_user_id = COALESCE(?, head_user_id),
       parent_id = ?,
       status = COALESCE(?, status),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(name || null, description ?? null, headUserId || null,
        parentId !== undefined ? parentId : dept.parent_id,
        status || null, req.params.id);

  logActivity({ actorId: req.user.id, action: 'DEPARTMENT_UPDATED', entityType: 'department', entityId: req.params.id });
  res.json({ data: db.prepare(`${SELECT_DEPT} WHERE d.id = ?`).get(req.params.id) });
}));

// DELETE /api/departments/:id — soft delete (deactivate); blocked if it still has active employees/assets
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found');

  db.prepare(`UPDATE departments SET status = 'INACTIVE', updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);
  logActivity({ actorId: req.user.id, action: 'DEPARTMENT_DEACTIVATED', entityType: 'department', entityId: req.params.id });
  res.json({ message: 'Department deactivated' });
}));

module.exports = router;
