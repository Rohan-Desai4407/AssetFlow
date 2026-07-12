const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { ApiError } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(
      `SELECT id, name, email, role, department_id, status FROM users WHERE id = ?`
    ).get(payload.sub);
    if (!user) return next(new ApiError(401, 'Invalid session'));
    if (user.status !== 'ACTIVE') return next(new ApiError(403, 'Account is inactive'));
    req.user = user;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired session'));
  }
}

/** requireRole('ADMIN', 'ASSET_MANAGER') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { signToken, authenticate, requireRole, JWT_SECRET };
