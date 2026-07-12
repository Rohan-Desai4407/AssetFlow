const express = require('express');
const { db } = require('../db');
const { ApiError, paginationParams } = require('../utils/helpers');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications — the current user's notifications
router.get('/', asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const where = unreadOnly === 'true' ? 'AND is_read = 0' : '';
  const rows = db.prepare(
    `SELECT * FROM notifications WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(req.user.id, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? ${where}`).get(req.user.id).c;
  const unread = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`).get(req.user.id).c;
  res.json({ data: rows, page, limit, total, unread });
}));

// POST /api/notifications/:id/read
router.post('/:id/read', asyncHandler(async (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) throw new ApiError(404, 'Notification not found');
  if (n.user_id !== req.user.id) throw new ApiError(403, 'Not authorized');
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read' });
}));

// POST /api/notifications/read-all
router.post('/read-all', asyncHandler(async (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ message: 'All notifications marked as read' });
}));

module.exports = router;
