const { Router } = require('express');
const controller = require('./employees.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  promoteEmployeeSchema,
} = require('./employees.validators');

const router = Router();
router.use(authenticate);

// Readable by any authenticated user (needed to search employees when
// allocating assets, assigning bookings on behalf of a department, etc).
router.get('/', validateQuery(listEmployeesQuerySchema), controller.list);
router.get('/:id', controller.getById);

// Only Admins manage the Employee Directory (Screen 3, Tab C).
router.patch('/:id', requireRole('ADMIN'), validateBody(updateEmployeeSchema), controller.update);
router.patch('/:id/role', requireRole('ADMIN'), validateBody(promoteEmployeeSchema), controller.promote);

module.exports = router;
