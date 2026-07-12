const asyncHandler = require('../utils/asyncHandler');
const service = require('./employees.service');

const list = asyncHandler(async (req, res) => res.json(service.list(req.query)));
const getById = asyncHandler(async (req, res) => res.json({ data: service.getById(req.params.id) }));
const update = asyncHandler(async (req, res) => res.json({ data: service.update(req.params.id, req.body, req.user) }));
const promote = asyncHandler(async (req, res) =>
  res.json({ data: service.promote(req.params.id, req.body.role, req.user) })
);

module.exports = { list, getById, update, promote };
