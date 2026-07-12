const express = require('express');
const { db } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'));

// GET /api/reports/utilization — most-used vs idle assets (by allocation count + booking count)
router.get('/utilization', asyncHandler(async (req, res) => {
  const rows = db.prepare(
    `SELECT a.id, a.asset_tag, a.name, a.status,
       (SELECT COUNT(*) FROM allocations al WHERE al.asset_id = a.id) AS allocation_count,
       (SELECT COUNT(*) FROM bookings b WHERE b.asset_id = a.id) AS booking_count
     FROM assets a
     ORDER BY (allocation_count + booking_count) DESC`
  ).all();
  res.json({ data: rows });
}));

// GET /api/reports/maintenance-frequency — by asset and category
router.get('/maintenance-frequency', asyncHandler(async (req, res) => {
  const byAsset = db.prepare(
    `SELECT a.id AS asset_id, a.asset_tag, a.name, COUNT(m.id) AS request_count,
       SUM(CASE WHEN m.status = 'RESOLVED' THEN COALESCE(m.cost, 0) ELSE 0 END) AS total_cost
     FROM assets a LEFT JOIN maintenance_requests m ON m.asset_id = a.id
     GROUP BY a.id ORDER BY request_count DESC`
  ).all();
  const byCategory = db.prepare(
    `SELECT c.id AS category_id, c.name AS category_name, COUNT(m.id) AS request_count
     FROM asset_categories c
     LEFT JOIN assets a ON a.category_id = c.id
     LEFT JOIN maintenance_requests m ON m.asset_id = a.id
     GROUP BY c.id ORDER BY request_count DESC`
  ).all();
  res.json({ data: { byAsset, byCategory } });
}));

// GET /api/reports/upcoming — assets due for maintenance or nearing retirement
router.get('/upcoming', asyncHandler(async (req, res) => {
  const nearingRetirement = db.prepare(
    `SELECT id, asset_tag, name, acquisition_date, condition, status FROM assets
     WHERE condition IN ('POOR','FAIR') OR (acquisition_date IS NOT NULL AND julianday('now') - julianday(acquisition_date) > 365 * 5)
     ORDER BY acquisition_date ASC`
  ).all();
  const dueForMaintenance = db.prepare(
    `SELECT a.id, a.asset_tag, a.name, MAX(m.created_at) AS last_maintenance
     FROM assets a LEFT JOIN maintenance_requests m ON m.asset_id = a.id
     WHERE a.status != 'DISPOSED'
     GROUP BY a.id
     HAVING last_maintenance IS NULL OR julianday('now') - julianday(last_maintenance) > 180
     ORDER BY last_maintenance ASC`
  ).all();
  res.json({ data: { nearingRetirement, dueForMaintenance } });
}));

// GET /api/reports/department-allocations — department-wise allocation summary
router.get('/department-allocations', asyncHandler(async (req, res) => {
  const rows = db.prepare(
    `SELECT d.id AS department_id, d.name AS department_name,
       COUNT(DISTINCT al.id) AS active_allocations,
       COUNT(DISTINCT a.id) AS assets_in_department
     FROM departments d
     LEFT JOIN assets a ON a.department_id = d.id
     LEFT JOIN allocations al ON al.allocated_to_department_id = d.id AND al.status = 'ACTIVE'
     GROUP BY d.id ORDER BY d.name`
  ).all();
  res.json({ data: rows });
}));

// GET /api/reports/booking-heatmap — bookings grouped by day-of-week and hour
router.get('/booking-heatmap', asyncHandler(async (req, res) => {
  const rows = db.prepare(
    `SELECT strftime('%w', start_time) AS day_of_week, strftime('%H', start_time) AS hour, COUNT(*) AS bookings
     FROM bookings WHERE status != 'CANCELLED'
     GROUP BY day_of_week, hour ORDER BY day_of_week, hour`
  ).all();
  res.json({ data: rows });
}));

module.exports = router;
