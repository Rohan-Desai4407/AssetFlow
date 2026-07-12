const { ApiError } = require('../utils/helpers');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err instanceof ApiError ? err.status : (err.status || 500);
  const message = err.message || 'Internal server error';
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: message,
    details: err.details || undefined,
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
