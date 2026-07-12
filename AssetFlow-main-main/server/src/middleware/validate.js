const { ApiError } = require('../utils/helpers');

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(new ApiError(400, error.errors[0]?.message || 'Validation Error'));
  }
};

const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    next(new ApiError(400, error.errors[0]?.message || 'Validation Error'));
  }
};

module.exports = { validateBody, validateQuery };
