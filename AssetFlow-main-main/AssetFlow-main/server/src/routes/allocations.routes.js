const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity, notify, paginationParams } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { setAssetStatus } = require('./assets.routes');

const router = express.Router();
router.use(authenticate);

const SELECT_ALLOCATION = `
  SELECT al.*, a.asset_tag, a.name AS asset_name,
         u.name AS allocated_to_name, dep.name AS allocated_to_department_name
  FROM allocations al
  JOIN assets a ON a.id = al.asset_id
  LEFT JOIN users u ON u.id = al.allocated_to_user_id
  LEFT JOIN departments dep ON dep.id = al.allocated_to_department_id
`;

function activeAllocationFor(assetId) {
  return db.prepare(`SELECT * FROM allocations WHERE asset_id = ? AND status = 'ACTIVE'`).get(assetId);
}

// GET /api/allocations
router.get('/', asyncHandler(async (req, res) => {
  const { assetId, status, overdue } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (assetId) { clauses.push('al.asset_id = ?'); params.push(assetId); }
  if (status) { clauses.push('al.status = ?'); params.push(status); }
  if (overdue === 'true') {
    clauses.push(`al.status = 'ACTIVE' AND al.expected_return_date IS NOT NULL AND al.expected_return_date < datetime('now')`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`${SELECT_ALLOCATION} ${where} ORDER BY al.allocated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM allocations al ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// POST /api/allocations — allocate an asset. Blocked if it already has an ACTIVE allocation.
router.post('/', requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), asyncHandler(async (req, res) => {
  const { assetId, allocateToUserId, allocateToDepartmentId, expectedReturnDate } = req.body;
  if (!assetId) throw new ApiError(400, 'assetId is required');
  if (!allocateToUserId && !allocateToDepartmentId) {
    throw new ApiError(400, 'Provide allocateToUserId or allocateToDepartmentId');
  }

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const existing = activeAllocationFor(assetId);
  if (existing) {
    const holderName = existing.allocated_to_user_id
      ? db.prepare('SELECT name FROM users WHERE id = ?').get(existing.allocated_to_user_id)?.name
      : db.prepare('SELECT name FROM departments WHERE id = ?').get(existing.allocated_to_department_id)?.name;
    throw new ApiError(409, `Asset is currently held by ${holderName || 'another holder'}. Use a Transfer Request instead.`, {
      currentAllocationId: existing.id, currentHolder: holderName,
    });
  }
  if (!['AVAILABLE', 'RESERVED'].includes(asset.status)) {
    throw new ApiError(400, `Asset is ${asset.status} and cannot be allocated`);
  }

  const id = uuid();
  const result = db.transaction(() => {
    db.prepare(
      `INSERT INTO allocations (id, asset_id, allocated_to_user_id, allocated_to_department_id, allocated_by, expected_return_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`
    ).run(id, assetId, allocateToUserId || null, allocateToDepartmentId || null, req.user.id, expectedReturnDate || null);
    setAssetStatus(assetId, 'ALLOCATED', req.user.id, 'Allocated');
    return db.prepare(`${SELECT_ALLOCATION} WHERE al.id = ?`).get(id);
  })();

  logActivity({ actorId: req.user.id, action: 'ASSET_ALLOCATED', entityType: 'allocation', entityId: id, details: { assetId } });
  if (allocateToUserId) {
    notify({
      userId: allocateToUserId, type: 'ASSET_ASSIGNED', title: 'Asset assigned to you',
      message: `${asset.name} (${asset.asset_tag}) has been allocated to you.`, entityType: 'asset', entityId: assetId,
    });
  }

  res.status(201).json({ data: result });
}));

// POST /api/allocations/:id/return — mark returned, capture condition check-in
router.post('/:id/return', requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), asyncHandler(async (req, res) => {
  const allocation = db.prepare('SELECT * FROM allocations WHERE id = ?').get(req.params.id);
  if (!allocation) throw new ApiError(404, 'Allocation not found');
  if (allocation.status !== 'ACTIVE') throw new ApiError(400, 'This allocation is not active');

  const { returnCondition, returnNotes } = req.body;

  db.transaction(() => {
    db.prepare(
      `UPDATE allocations SET status = 'RETURNED', returned_at = datetime('now'),
         return_condition = ?, return_notes = ?, returned_by = ? WHERE id = ?`
    ).run(returnCondition || null, returnNotes || null, req.user.id, req.params.id);
    setAssetStatus(allocation.asset_id, 'AVAILABLE', req.user.id, 'Returned');
    if (returnCondition) {
      db.prepare(`UPDATE assets SET condition = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(returnCondition, allocation.asset_id);
    }
  })();

  logActivity({ actorId: req.user.id, action: 'ASSET_RETURNED', entityType: 'allocation', entityId: req.params.id });
  res.json({ data: db.prepare(`${SELECT_ALLOCATION} WHERE al.id = ?`).get(req.params.id) });
}));

// ---- Transfer workflow: Requested -> Approved (by Asset Manager/Dept Head) -> Re-allocated ----

const SELECT_TRANSFER = `
  SELECT t.*, a.asset_tag, a.name AS asset_name
  FROM transfer_requests t JOIN assets a ON a.id = t.asset_id
`;

// GET /api/allocations/transfers/list
router.get('/transfers/list', asyncHandler(async (req, res) => {
  const { status, assetId } = req.query;
  const { page, limit, offset } = paginationParams(req.query);
  const clauses = [];
  const params = [];
  if (status) { clauses.push('t.status = ?'); params.push(status); }
  if (assetId) { clauses.push('t.asset_id = ?'); params.push(assetId); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`${SELECT_TRANSFER} ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM transfer_requests t ${where}`).get(...params).c;
  res.json({ data: rows, page, limit, total });
}));

// POST /api/allocations/transfers — raise a transfer request against a currently-held asset
router.post('/transfers', asyncHandler(async (req, res) => {
  const { assetId, requestedToUserId, requestedToDepartmentId, reason } = req.body;
  if (!assetId) throw new ApiError(400, 'assetId is required');
  if (!requestedToUserId && !requestedToDepartmentId) {
    throw new ApiError(400, 'Provide requestedToUserId or requestedToDepartmentId');
  }
  const current = activeAllocationFor(assetId);
  if (!current) throw new ApiError(400, 'Asset has no active allocation to transfer');

  const id = uuid();
  db.prepare(
    `INSERT INTO transfer_requests (id, asset_id, current_allocation_id, requested_by, requested_to_user_id, requested_to_department_id, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED')`
  ).run(id, assetId, current.id, req.user.id, requestedToUserId || null, requestedToDepartmentId || null, reason || null);

  logActivity({ actorId: req.user.id, action: 'TRANSFER_REQUESTED', entityType: 'transfer_request', entityId: id, details: { assetId } });
  res.status(201).json({ data: db.prepare(`${SELECT_TRANSFER} WHERE t.id = ?`).get(id) });
}));

// POST /api/allocations/transfers/:id/decision — { decision: 'APPROVED' | 'REJECTED' }
router.post('/transfers/:id/decision', requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), asyncHandler(async (req, res) => {
  const transfer = db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(req.params.id);
  if (!transfer) throw new ApiError(404, 'Transfer request not found');
  if (transfer.status !== 'REQUESTED') throw new ApiError(400, 'This transfer request has already been decided');

  const { decision } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ApiError(400, 'decision must be APPROVED or REJECTED');

  if (decision === 'REJECTED') {
    db.prepare(`UPDATE transfer_requests SET status = 'REJECTED', approved_by = ?, approved_at = datetime('now') WHERE id = ?`)
      .run(req.user.id, req.params.id);
    logActivity({ actorId: req.user.id, action: 'TRANSFER_REJECTED', entityType: 'transfer_request', entityId: req.params.id });
    return res.json({ data: db.prepare(`${SELECT_TRANSFER} WHERE t.id = ?`).get(req.params.id) });
  }

  // APPROVED: close current allocation, open a new one; history stays intact via the allocations table
  const result = db.transaction(() => {
    const current = db.prepare('SELECT * FROM allocations WHERE id = ?').get(transfer.current_allocation_id);
    db.prepare(`UPDATE allocations SET status = 'TRANSFERRED', returned_at = datetime('now') WHERE id = ?`)
      .run(current.id);

    const newAllocationId = uuid();
    db.prepare(
      `INSERT INTO allocations (id, asset_id, allocated_to_user_id, allocated_to_department_id, allocated_by, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`
    ).run(newAllocationId, transfer.asset_id, transfer.requested_to_user_id, transfer.requested_to_department_id, req.user.id);

    db.prepare(
      `UPDATE transfer_requests SET status = 'COMPLETED', approved_by = ?, approved_at = datetime('now'), new_allocation_id = ? WHERE id = ?`
    ).run(req.user.id, newAllocationId, req.params.id);

    return db.prepare(`${SELECT_TRANSFER} WHERE t.id = ?`).get(req.params.id);
  })();

  logActivity({ actorId: req.user.id, action: 'TRANSFER_APPROVED', entityType: 'transfer_request', entityId: req.params.id });
  if (transfer.requested_to_user_id) {
    notify({
      userId: transfer.requested_to_user_id, type: 'TRANSFER_APPROVED', title: 'Asset transfer approved',
      message: 'An asset has been transferred to you.', entityType: 'transfer_request', entityId: req.params.id,
    });
  }
  res.json({ data: result });
}));

module.exports = router;
