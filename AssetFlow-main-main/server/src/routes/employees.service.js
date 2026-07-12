const { db } = require('../db/client');
const ApiError = require('../utils/ApiError');
const { serializeUser } = require('../utils/serializers');
const { parsePagination, buildPaginatedResult } = require('../utils/pagination');
const { logActivity } = require('../services/activityLog.service');
const { notify } = require('../services/notification.service');

const BASE_SELECT = `
  SELECT u.*, d.name as departmentName
  FROM users u LEFT JOIN departments d ON d.id = u.department_id
`;

function list(query) {
  const { search, role, status, departmentId } = query;
  const { page, pageSize, offset, limit } = parsePagination(query);

  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    clauses.push('u.role = ?');
    params.push(role);
  }
  if (status) {
    clauses.push('u.status = ?');
    params.push(status);
  }
  if (departmentId) {
    clauses.push('u.department_id = ?');
    params.push(departmentId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM users u ${where}`).get(...params).c;
  const rows = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY u.name ASC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return buildPaginatedResult(rows.map(serializeUser), total, page, pageSize);
}

function getById(id) {
  const row = db.prepare(`${BASE_SELECT} WHERE u.id = ?`).get(id);
  if (!row) throw ApiError.notFound('Employee not found');
  return serializeUser(row);
}

function update(id, input, actor) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Employee not found');

  if (input.departmentId) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(input.departmentId);
    if (!dept) throw new ApiError(400, 'Selected department does not exist.');
  }

  const merged = {
    name: input.name ?? existing.name,
    departmentId: input.departmentId !== undefined ? input.departmentId : existing.department_id,
    status: input.status ?? existing.status,
  };

  db.prepare(
    `UPDATE users SET name = ?, department_id = ?, status = ?,
      updated_at = datetime('now') WHERE id = ?`
  ).run(merged.name, merged.departmentId || null, merged.status, id);

  if (input.status && input.status !== existing.status) {
    logActivity({
      actorId: actor.id,
      action: input.status === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      details: { description: `${actor.name} set ${existing.name}'s status to ${input.status}` },
    });
  } else {
    logActivity({
      actorId: actor.id,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'User',
      entityId: id,
      details: { description: `${actor.name} updated employee ${existing.name}` },
    });
  }

  return getById(id);
}

/**
 * Screen 3, Tab C: "Admin promotes an Employee to Department Head or Asset
 * Manager here -- this is the only place roles are assigned."
 * Also allows demoting back to EMPLOYEE, or (rarely) promoting another Admin.
 */
function promote(id, role, actor) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Employee not found');

  if (existing.role === role) {
    return getById(id);
  }

  db.prepare(
    `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(role, id);

  logActivity({
    actorId: actor.id,
    action: 'EMPLOYEE_ROLE_CHANGED',
    entityType: 'User',
    entityId: id,
    details: { 
      description: `${actor.name} changed ${existing.name}'s role from ${existing.role} to ${role}`,
      previousRole: existing.role, 
      newRole: role 
    },
  });

  notify({
    userId: id,
    type: 'ROLE_CHANGED',
    title: 'Your role has changed',
    message: `An administrator changed your role to ${role.replace('_', ' ')}.`,
    entityType: 'user',
    entityId: id,
  });

  return getById(id);
}

module.exports = { list, getById, update, promote };
