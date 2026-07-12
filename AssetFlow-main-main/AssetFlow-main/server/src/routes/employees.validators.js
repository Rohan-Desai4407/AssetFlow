const { z } = require('zod');

const listEmployeesQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  departmentId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  departmentId: z.string().min(1).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// This is the ONLY place in the API where a role can be changed -- mirrors
// the problem statement: "Admin promotes an Employee to Department Head or
// Asset Manager here -- this is the only place roles are assigned."
const promoteEmployeeSchema = z.object({
  role: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']),
});

module.exports = { listEmployeesQuerySchema, updateEmployeeSchema, promoteEmployeeSchema };
