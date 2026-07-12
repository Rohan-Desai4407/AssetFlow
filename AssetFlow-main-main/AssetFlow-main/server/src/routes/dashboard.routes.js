const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard — KPI cards + overdue vs upcoming returns
router.get('/', asyncHandler(async (req, res) => {
  const count = (sql, ...params) => db.prepare(sql).get(...params).c;

  const kpis = {
    assetsAvailable: count(`SELECT COUNT(*) AS c FROM assets WHERE status = 'AVAILABLE'`),
    assetsAllocated: count(`SELECT COUNT(*) AS c FROM assets WHERE status = 'ALLOCATED'`),
    maintenanceToday: count(
      `SELECT COUNT(*) AS c FROM maintenance_requests
       WHERE status IN ('APPROVED','TECHNICIAN_ASSIGNED','IN_PROGRESS') AND date(created_at) = date('now')`
    ),
    activeBookings: count(`SELECT COUNT(*) AS c FROM bookings WHERE status IN ('UPCOMING','ONGOING')`),
    pendingTransfers: count(`SELECT COUNT(*) AS c FROM transfer_requests WHERE status = 'REQUESTED'`),
    upcomingReturns: count(
      `SELECT COUNT(*) AS c FROM allocations
       WHERE status = 'ACTIVE' AND expected_return_date IS NOT NULL AND expected_return_date >= datetime('now')`
    ),
  };

  const overdueReturns = db.prepare(
    `SELECT al.id, a.asset_tag, a.name AS asset_name, u.name AS assigned_to, al.expected_return_date
     FROM allocations al JOIN assets a ON a.id = al.asset_id LEFT JOIN users u ON u.id = al.allocated_to_user_id
     WHERE al.status = 'ACTIVE' AND al.expected_return_date IS NOT NULL AND al.expected_return_date < datetime('now')
     ORDER BY al.expected_return_date ASC LIMIT 20`
  ).all();

  const upcomingReturnsList = db.prepare(
    `SELECT al.id, a.asset_tag, a.name AS asset_name, u.name AS assigned_to, al.expected_return_date
     FROM allocations al JOIN assets a ON a.id = al.asset_id LEFT JOIN users u ON u.id = al.allocated_to_user_id
     WHERE al.status = 'ACTIVE' AND al.expected_return_date IS NOT NULL AND al.expected_return_date >= datetime('now')
     ORDER BY al.expected_return_date ASC LIMIT 20`
  ).all();

  const overdueBookings = db.prepare(
    `SELECT b.id, a.asset_tag, a.name AS asset_name, u.name AS booked_by_name, b.start_time, b.end_time
     FROM bookings b JOIN assets a ON a.id = b.asset_id JOIN users u ON u.id = b.booked_by
     WHERE b.status = 'UPCOMING' AND b.start_time < datetime('now') LIMIT 20`
  ).all();

  const pendingMaintenance = db.prepare(
    `SELECT m.id, a.asset_tag, a.name AS asset_name, m.priority, m.status, m.created_at
     FROM maintenance_requests m JOIN assets a ON a.id = m.asset_id
     WHERE m.status IN ('PENDING','APPROVED','TECHNICIAN_ASSIGNED','IN_PROGRESS')
     ORDER BY m.created_at DESC LIMIT 20`
  ).all();

  res.json({ kpis, overdueReturns, upcomingReturns: upcomingReturnsList, overdueBookings, pendingMaintenance });
}));

module.exports = router;
