const express = require('express');
const { db } = require('../db');
const { uuid, ApiError, logActivity } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

function attachFields(category) {
  category.fields = db.prepare('SELECT * FROM category_fields WHERE category_id = ?').all(category.id);
  return category;
}

// GET /api/categories
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM asset_categories WHERE status = ? ORDER BY name').all(status)
    : db.prepare('SELECT * FROM asset_categories ORDER BY name').all();
  res.json({ data: rows.map(attachFields) });
}));

// GET /api/categories/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(req.params.id);
  if (!row) throw new ApiError(404, 'Category not found');
  res.json({ data: attachFields(row) });
}));

// POST /api/categories  (Admin only) — body: { name, description, fields: [{fieldName, fieldType, isRequired}] }
router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name, description, fields } = req.body;
  if (!name) throw new ApiError(400, 'name is required');

  const id = uuid();
  const insertCategory = db.prepare(
    `INSERT INTO asset_categories (id, name, description, status) VALUES (?, ?, ?, 'ACTIVE')`
  );
  const insertField = db.prepare(
    `INSERT INTO category_fields (id, category_id, field_name, field_type, is_required) VALUES (?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    insertCategory.run(id, name, description || null);
    for (const f of fields || []) {
      if (!f.fieldName) continue;
      insertField.run(uuid(), id, f.fieldName, f.fieldType || 'TEXT', f.isRequired ? 1 : 0);
    }
  })();

  logActivity({ actorId: req.user.id, action: 'CATEGORY_CREATED', entityType: 'asset_category', entityId: id, details: { name } });
  res.status(201).json({ data: attachFields(db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(id)) });
}));

// PATCH /api/categories/:id  (Admin only)
router.patch('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const cat = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(req.params.id);
  if (!cat) throw new ApiError(404, 'Category not found');

  const { name, description, status, fields } = req.body;
  db.prepare(
    `UPDATE asset_categories SET name = COALESCE(?, name), description = COALESCE(?, description),
       status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?`
  ).run(name || null, description ?? null, status || null, req.params.id);

  if (Array.isArray(fields)) {
    db.transaction(() => {
      db.prepare('DELETE FROM category_fields WHERE category_id = ?').run(req.params.id);
      const insertField = db.prepare(
        `INSERT INTO category_fields (id, category_id, field_name, field_type, is_required) VALUES (?, ?, ?, ?, ?)`
      );
      for (const f of fields) {
        if (!f.fieldName) continue;
        insertField.run(uuid(), req.params.id, f.fieldName, f.fieldType || 'TEXT', f.isRequired ? 1 : 0);
      }
    })();
  }

  logActivity({ actorId: req.user.id, action: 'CATEGORY_UPDATED', entityType: 'asset_category', entityId: req.params.id });
  res.json({ data: attachFields(db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(req.params.id)) });
}));

// DELETE /api/categories/:id — soft delete, blocked if assets still reference it
router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const cat = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(req.params.id);
  if (!cat) throw new ApiError(404, 'Category not found');
  const assetCount = db.prepare('SELECT COUNT(*) AS c FROM assets WHERE category_id = ?').get(req.params.id).c;
  if (assetCount > 0) {
    db.prepare(`UPDATE asset_categories SET status = 'INACTIVE', updated_at = datetime('now') WHERE id = ?`)
      .run(req.params.id);
    logActivity({ actorId: req.user.id, action: 'CATEGORY_DEACTIVATED', entityType: 'asset_category', entityId: req.params.id });
    return res.json({ message: `Category has ${assetCount} asset(s) attached — deactivated instead of deleted` });
  }
  db.prepare('DELETE FROM asset_categories WHERE id = ?').run(req.params.id);
  logActivity({ actorId: req.user.id, action: 'CATEGORY_DELETED', entityType: 'asset_category', entityId: req.params.id });
  res.json({ message: 'Category deleted' });
}));

module.exports = router;
