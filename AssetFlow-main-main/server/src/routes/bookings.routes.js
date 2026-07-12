const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity, notify, paginationParams, rangesOverlap } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

const SELECT_BOOKING = `
  SELECT b.*, a.asset_tag, a.name AS asset_name, u.name AS booked_by_name, d.name AS department_name
  FROM bookings b
  JOIN assets a ON a.id = b.asset_id
  JOIN users u ON u.id = b.booked_by
  LEFT JOIN departments d ON d.id = b.department_id
`;

function hasOverlap(assetId, start, end, excludeBookingId) {
  const rows = db.prepare(
    `SELECT id, start_time, end_time FROM bookings
     WHERE asset_id = ? AND status IN ('UPCOMING','ONGOING') AND id != ?`
  ).all(assetId, excludeBookingId || '');
  return rows.some(r => rangesOverlap(start, end, r.start_time, r.end_time));
}

// GET /api/bookings — supports calendar view via ?assetId=&from=&to=
router.get('/', asyncHandler(async (req, res) => {
  const { assetId, status, from, to } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (assetId) { clauses.push('b.asset_id = ?'); params.push(assetId); }
  if (status) { clauses.push('b.status = ?'); params.push(status); }
  if (from) { clauses.push('b.end_time >= ?'); params.push(from); }
  if (to) { clauses.push('b.start_time <= ?'); params.push(to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`${SELECT_BOOKING} ${where} ORDER BY b.start_time LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM bookings b ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// POST /api/bookings — create a booking; rejects if it overlaps an existing UPCOMING/ONGOING booking
router.post('/', asyncHandler(async (req, res) => {
  const { assetId, startTime, endTime, purpose, departmentId } = req.body;
  if (!assetId || !startTime || !endTime) throw new ApiError(400, 'assetId, startTime and endTime are required');
  if (new Date(endTime) <= new Date(startTime)) throw new ApiError(400, 'endTime must be after startTime');
  if (new Date(startTime) < new Date()) throw new ApiError(400, 'Cannot book a slot in the past');

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (!asset.is_bookable) throw new ApiError(400, 'This asset is not marked as a shared/bookable resource');
  if (['LOST', 'RETIRED', 'DISPOSED', 'UNDER_MAINTENANCE'].includes(asset.status)) {
    throw new ApiError(400, `Asset is ${asset.status} and cannot be booked`);
  }

  if (hasOverlap(assetId, startTime, endTime)) {
    throw new ApiError(409, 'This time slot overlaps with an existing booking for this resource');
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO bookings (id, asset_id, booked_by, department_id, start_time, end_time, purpose, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'UPCOMING')`
  ).run(id, assetId, req.user.id, departmentId || null, startTime, endTime, purpose || null);

  logActivity({ actorId: req.user.id, action: 'BOOKING_CREATED', entityType: 'booking', entityId: id, details: { assetId, startTime, endTime } });
  notify({
    userId: req.user.id, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed',
    message: `${asset.name} booked ${startTime} to ${endTime}.`, entityType: 'booking', entityId: id,
  });

  res.status(201).json({ data: db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(id) });
}));

// PATCH /api/bookings/:id — reschedule (re-validates overlap)
router.patch('/:id', asyncHandler(async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.booked_by !== req.user.id && !['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'].includes(req.user.role)) {
    throw new ApiError(403, 'Not authorized to modify this booking');
  }
  if (!['UPCOMING'].includes(booking.status)) throw new ApiError(400, 'Only upcoming bookings can be rescheduled');

  const startTime = req.body.startTime || booking.start_time;
  const endTime = req.body.endTime || booking.end_time;
  if (new Date(endTime) <= new Date(startTime)) throw new ApiError(400, 'endTime must be after startTime');
  if (hasOverlap(booking.asset_id, startTime, endTime, booking.id)) {
    throw new ApiError(409, 'This time slot overlaps with an existing booking for this resource');
  }

  db.prepare(
    `UPDATE bookings SET start_time = ?, end_time = ?, purpose = COALESCE(?, purpose), updated_at = datetime('now') WHERE id = ?`
  ).run(startTime, endTime, req.body.purpose || null, req.params.id);

  logActivity({ actorId: req.user.id, action: 'BOOKING_RESCHEDULED', entityType: 'booking', entityId: req.params.id });
  res.json({ data: db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(req.params.id) });
}));

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.booked_by !== req.user.id && !['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'].includes(req.user.role)) {
    throw new ApiError(403, 'Not authorized to cancel this booking');
  }
  if (!['UPCOMING', 'ONGOING'].includes(booking.status)) throw new ApiError(400, 'Booking cannot be cancelled');

  db.prepare(
    `UPDATE bookings SET status = 'CANCELLED', cancelled_reason = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(req.body.reason || null, req.params.id);

  logActivity({ actorId: req.user.id, action: 'BOOKING_CANCELLED', entityType: 'booking', entityId: req.params.id });
  notify({
    userId: booking.booked_by, type: 'BOOKING_CANCELLED', title: 'Booking cancelled',
    message: 'Your resource booking has been cancelled.', entityType: 'booking', entityId: req.params.id,
  });
  res.json({ data: db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(req.params.id) });
}));

module.exports = router;
