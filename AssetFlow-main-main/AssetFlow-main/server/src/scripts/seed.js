/**
 * Seeds the database with:
 *  - one Admin account (needed to bootstrap the system, since signup only creates Employees)
 *  - a couple of departments and asset categories
 *  - a few sample assets
 * Run with: npm run seed
 */
const bcrypt = require('bcryptjs');
const { db, initSchema } = require('../db');
const { uuid } = require('../utils/helpers');

async function seed() {
  initSchema();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@assetflow.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

  let admin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  if (!admin) {
    const id = uuid();
    const hash = await bcrypt.hash(adminPassword, 10);
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')`
    ).run(id, 'System Admin', adminEmail, hash);
    admin = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    console.log(`Created admin account: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  // Departments
  const deptNames = ['Engineering', 'Operations', 'Human Resources'];
  const deptIds = {};
  for (const name of deptNames) {
    let dept = db.prepare('SELECT * FROM departments WHERE name = ?').get(name);
    if (!dept) {
      const id = uuid();
      db.prepare(`INSERT INTO departments (id, name, status) VALUES (?, ?, 'ACTIVE')`).run(id, name);
      dept = { id };
    }
    deptIds[name] = dept.id;
  }

  // Categories
  const categories = [
    { name: 'Electronics', fields: [{ fieldName: 'Warranty Period (months)', fieldType: 'NUMBER' }] },
    { name: 'Furniture', fields: [] },
    { name: 'Vehicles', fields: [{ fieldName: 'License Plate', fieldType: 'TEXT' }] },
  ];
  const categoryIds = {};
  for (const c of categories) {
    let cat = db.prepare('SELECT * FROM asset_categories WHERE name = ?').get(c.name);
    if (!cat) {
      const id = uuid();
      db.prepare(`INSERT INTO asset_categories (id, name, status) VALUES (?, ?, 'ACTIVE')`).run(id, c.name);
      for (const f of c.fields) {
        db.prepare(
          `INSERT INTO category_fields (id, category_id, field_name, field_type, is_required) VALUES (?, ?, ?, ?, 0)`
        ).run(uuid(), id, f.fieldName, f.fieldType);
      }
      cat = { id };
    }
    categoryIds[c.name] = cat.id;
  }

  // Sample assets
  const existingAssets = db.prepare('SELECT COUNT(*) AS c FROM assets').get().c;
  if (existingAssets === 0) {
    const sampleAssets = [
      { name: 'Dell XPS 15 Laptop', category: 'Electronics', dept: 'Engineering', bookable: 0, cost: 1450 },
      { name: 'Conference Room A', category: 'Furniture', dept: 'Operations', bookable: 1, cost: 0 },
      { name: 'Toyota Hiace Van', category: 'Vehicles', dept: 'Operations', bookable: 1, cost: 32000 },
      { name: 'Projector - Epson EB-X41', category: 'Electronics', dept: 'Human Resources', bookable: 1, cost: 620 },
    ];
    let tagNum = 1;
    for (const a of sampleAssets) {
      const id = uuid();
      const assetTag = `AF-${String(tagNum++).padStart(4, '0')}`;
      db.prepare(
        `INSERT INTO assets (id, asset_tag, name, category_id, department_id, is_bookable, status, condition, acquisition_cost, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', 'GOOD', ?, ?)`
      ).run(id, assetTag, a.name, categoryIds[a.category], deptIds[a.dept], a.bookable, a.cost, admin.id);
      db.prepare(
        `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, reason, changed_by)
         VALUES (?, ?, NULL, 'AVAILABLE', 'Seeded', ?)`
      ).run(uuid(), id, admin.id);
    }
    console.log(`Seeded ${sampleAssets.length} sample assets`);
  }

  console.log('Seed complete.');
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
