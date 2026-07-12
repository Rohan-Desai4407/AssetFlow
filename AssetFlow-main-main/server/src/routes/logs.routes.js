const express = require('express');
const { db } = require('../db');
const { paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /api/logs — Admin/Asset Manager can see the full org-wide log
router.get('/', requireRole('ADMIN', 'ASSET_MANAGER'), asyncHandler(async (req, res) => {
  const { actorId, entityType, action, from, to } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (actorId) { clauses.push('l.actor_id = ?'); params.push(actorId); }
  if (entityType) { clauses.push('l.entity_type = ?'); params.push(entityType); }
  if (action) { clauses.push('l.action = ?'); params.push(action); }
  if (from) { clauses.push('l.created_at >= ?'); params.push(from); }
  if (to) { clauses.push('l.created_at <= ?'); params.push(to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT l.*, u.name AS actor_name FROM activity_logs l LEFT JOIN users u ON u.id = l.actor_id
     ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM activity_logs l ${where}`).get(...params).c;
  res.json({ data: rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null })), page, limit, total });
}));

module.exports = router;
