const crypto = require('crypto');
const { db } = require('../db');

const uuid = () => crypto.randomUUID();

/** Generates the next sequential asset tag, e.g. AF-0001, AF-0002 ... */
function nextAssetTag() {
  const row = db.prepare(
    `SELECT asset_tag FROM assets ORDER BY CAST(SUBSTR(asset_tag, 4) AS INTEGER) DESC LIMIT 1`
  ).get();
  let next = 1;
  if (row && row.asset_tag) {
    const n = parseInt(row.asset_tag.split('-')[1], 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `AF-${String(next).padStart(4, '0')}`;
}

/** Records an entry in activity_logs. `details` may be any JSON-serializable object. */
function logActivity({ actorId, action, entityType, entityId, details }) {
  db.prepare(
    `INSERT INTO activity_logs (id, actor_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuid(), actorId || null, action, entityType, entityId || null, details ? JSON.stringify(details) : null);
}

/** Creates an in-app notification for a single user. */
function notify({ userId, type, title, message, entityType, entityId }) {
  if (!userId) return;
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), userId, type, title, message, entityType || null, entityId || null);
}

/** Notifies many users at once (e.g. all Asset Managers). */
function notifyMany(userIds, payload) {
  for (const userId of userIds) notify({ ...payload, userId });
}

function getUserIdsByRole(roles) {
  const placeholders = roles.map(() => '?').join(',');
  return db.prepare(`SELECT id FROM users WHERE role IN (${placeholders}) AND status = 'ACTIVE'`)
    .all(...roles).map(r => r.id);
}

function paginationParams(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

/** Two ranges [aStart,aEnd) and [bStart,bEnd) overlap iff aStart < bEnd AND bStart < aEnd */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = {
  uuid, nextAssetTag, logActivity, notify, notifyMany, getUserIdsByRole,
  paginationParams, rangesOverlap, ApiError,
};
