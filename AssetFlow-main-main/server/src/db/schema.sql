-- ============================================================================
-- AssetFlow — Enterprise Asset & Resource Management System
-- SQLite schema (better-sqlite3). Foreign keys enforced; WAL mode in db/index.js.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- USERS / AUTH / ROLES
-- Roles are assigned ONLY by Admin from the Employee Directory (never at signup).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,               -- uuid
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'EMPLOYEE'
                        CHECK (role IN ('ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD','EMPLOYEE')),
  department_id     TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  reset_token       TEXT,
  reset_token_expires_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- DEPARTMENTS (Org Setup — Tab A). Self-referencing for parent hierarchy.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  head_user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  parent_id         TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- ASSET CATEGORIES (Org Setup — Tab B) + dynamic custom fields
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_categories (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Optional per-category custom field definitions (e.g. "Warranty Period" for Electronics)
CREATE TABLE IF NOT EXISTS category_fields (
  id                TEXT PRIMARY KEY,
  category_id       TEXT NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
  field_name        TEXT NOT NULL,
  field_type        TEXT NOT NULL DEFAULT 'TEXT' CHECK (field_type IN ('TEXT','NUMBER','DATE','BOOLEAN')),
  is_required       INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category_id, field_name)
);

-- ----------------------------------------------------------------------------
-- ASSETS — full lifecycle
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id                TEXT PRIMARY KEY,
  asset_tag         TEXT NOT NULL UNIQUE,            -- auto-generated AF-0001
  name              TEXT NOT NULL,
  category_id       TEXT NOT NULL REFERENCES asset_categories(id),
  serial_number     TEXT,
  qr_code           TEXT UNIQUE,
  acquisition_date  TEXT,
  acquisition_cost  REAL,                            -- reporting/ranking only, no accounting linkage
  condition         TEXT NOT NULL DEFAULT 'GOOD' CHECK (condition IN ('NEW','GOOD','FAIR','POOR','DAMAGED')),
  location          TEXT,
  department_id     TEXT REFERENCES departments(id) ON DELETE SET NULL,
  is_bookable       INTEGER NOT NULL DEFAULT 0,       -- shared/bookable flag
  status            TEXT NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE','ALLOCATED','RESERVED','UNDER_MAINTENANCE','LOST','RETIRED','DISPOSED')),
  photo_path        TEXT,
  notes             TEXT,
  created_by        TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);

CREATE TABLE IF NOT EXISTS asset_category_values (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  field_id          TEXT NOT NULL REFERENCES category_fields(id) ON DELETE CASCADE,
  value             TEXT,
  UNIQUE(asset_id, field_id)
);

CREATE TABLE IF NOT EXISTS asset_documents (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_path         TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  uploaded_by       TEXT REFERENCES users(id),
  uploaded_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every state transition, for the per-asset "lifecycle history"
CREATE TABLE IF NOT EXISTS asset_status_history (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_status       TEXT,
  to_status         TEXT NOT NULL,
  reason            TEXT,
  changed_by        TEXT REFERENCES users(id),
  changed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- ALLOCATIONS & TRANSFERS
-- Conflict rule enforced in app logic: an asset can only have one OPEN allocation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id                    TEXT PRIMARY KEY,
  asset_id              TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  allocated_to_user_id  TEXT REFERENCES users(id),
  allocated_to_department_id TEXT REFERENCES departments(id),
  allocated_by          TEXT REFERENCES users(id),
  allocated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  expected_return_date  TEXT,
  returned_at           TEXT,
  return_condition      TEXT,
  return_notes          TEXT,
  returned_by           TEXT REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETURNED','TRANSFERRED')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (allocated_to_user_id IS NOT NULL OR allocated_to_department_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_allocations_asset ON allocations(asset_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations(status);
-- Only one ACTIVE allocation per asset at a time (the actual conflict-prevention guardrail)
CREATE UNIQUE INDEX IF NOT EXISTS uq_allocations_one_active_per_asset
  ON allocations(asset_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS transfer_requests (
  id                    TEXT PRIMARY KEY,
  asset_id              TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  current_allocation_id TEXT REFERENCES allocations(id),
  requested_by          TEXT REFERENCES users(id),
  requested_to_user_id  TEXT REFERENCES users(id),
  requested_to_department_id TEXT REFERENCES departments(id),
  reason                TEXT,
  status                TEXT NOT NULL DEFAULT 'REQUESTED'
                            CHECK (status IN ('REQUESTED','APPROVED','REJECTED','COMPLETED')),
  approved_by           TEXT REFERENCES users(id),
  approved_at           TEXT,
  new_allocation_id     TEXT REFERENCES allocations(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transfers_asset ON transfer_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfer_requests(status);

-- ----------------------------------------------------------------------------
-- RESOURCE BOOKINGS — time-slot booking with overlap validation (app-enforced)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,   -- must be is_bookable=1
  booked_by         TEXT NOT NULL REFERENCES users(id),
  department_id     TEXT REFERENCES departments(id),
  start_time        TEXT NOT NULL,   -- ISO datetime
  end_time          TEXT NOT NULL,
  purpose           TEXT,
  status            TEXT NOT NULL DEFAULT 'UPCOMING'
                        CHECK (status IN ('UPCOMING','ONGOING','COMPLETED','CANCELLED')),
  cancelled_reason  TEXT,
  reminder_sent     INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_bookings_asset_time ON bookings(asset_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ----------------------------------------------------------------------------
-- MAINTENANCE — approval workflow before repair work starts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  raised_by         TEXT NOT NULL REFERENCES users(id),
  issue_description TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  photo_path        TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','REJECTED','TECHNICIAN_ASSIGNED','IN_PROGRESS','RESOLVED')),
  approved_by       TEXT REFERENCES users(id),
  approved_at       TEXT,
  rejection_reason  TEXT,
  technician_name   TEXT,
  technician_assigned_at TEXT,
  resolved_at       TEXT,
  resolution_notes  TEXT,
  cost              REAL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);

-- ----------------------------------------------------------------------------
-- AUDITS — structured cycles, assigned auditors, discrepancy reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_cycles (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  scope_department_id TEXT REFERENCES departments(id),
  scope_location    TEXT,
  start_date        TEXT NOT NULL,
  end_date          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','IN_PROGRESS','CLOSED')),
  created_by        TEXT REFERENCES users(id),
  closed_by         TEXT REFERENCES users(id),
  closed_at         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_auditors (
  id                TEXT PRIMARY KEY,
  audit_cycle_id    TEXT NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES users(id),
  UNIQUE(audit_cycle_id, user_id)
);

-- One row per asset in scope for the cycle
CREATE TABLE IF NOT EXISTS audit_items (
  id                TEXT PRIMARY KEY,
  audit_cycle_id    TEXT NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  result            TEXT CHECK (result IN ('VERIFIED','MISSING','DAMAGED')),
  notes             TEXT,
  checked_by        TEXT REFERENCES users(id),
  checked_at        TEXT,
  UNIQUE(audit_cycle_id, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_audit_items_cycle ON audit_items(audit_cycle_id);

-- Auto-generated for any item flagged MISSING/DAMAGED
CREATE TABLE IF NOT EXISTS audit_discrepancies (
  id                TEXT PRIMARY KEY,
  audit_cycle_id    TEXT NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  audit_item_id     TEXT NOT NULL REFERENCES audit_items(id) ON DELETE CASCADE,
  asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('MISSING','DAMAGED')),
  resolution_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN','RESOLVED')),
  resolved_by       TEXT REFERENCES users(id),
  resolved_at       TEXT,
  resolution_notes  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS & ACTIVITY LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,   -- e.g. ASSET_ASSIGNED, MAINTENANCE_APPROVED, BOOKING_REMINDER, OVERDUE_RETURN, AUDIT_DISCREPANCY...
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  entity_type       TEXT,            -- 'asset' | 'booking' | 'maintenance' | 'transfer' | 'audit' ...
  entity_id         TEXT,
  is_read           INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS activity_logs (
  id                TEXT PRIMARY KEY,
  actor_id          TEXT REFERENCES users(id),
  action            TEXT NOT NULL,     -- e.g. 'ASSET_REGISTERED', 'ALLOCATION_CREATED'
  entity_type       TEXT NOT NULL,
  entity_id         TEXT,
  details           TEXT,              -- JSON string of relevant diff/context
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
