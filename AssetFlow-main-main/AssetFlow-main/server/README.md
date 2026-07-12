# AssetFlow — Backend & Database

A complete Express + SQLite backend implementing every module in the problem statement:
Organization Setup, Asset Registration & Directory, Allocation & Transfer, Resource Booking,
Maintenance Management, Asset Audit, Reports & Analytics, and Activity Logs & Notifications.

## Why SQLite (`better-sqlite3`) instead of Postgres/Prisma

No external database server to install — the whole backend runs with two commands. The schema
(`src/db/schema.sql`) is hand-written SQL, so it's portable: if you outgrow SQLite, the same
schema (with minor type tweaks) drops straight into Postgres/MySQL.

## Setup

> ⚠️ This code was written and syntax-checked in a sandbox with **no network access**, so
> `npm install` has not actually been run against it yet. Run these commands yourself:

```bash
cd server
cp .env.example .env
npm install
npm run seed     # creates the first Admin account + demo departments/categories/assets
npm run dev       # starts the API on http://localhost:4000 (auto-reloads on changes)
```

The seed script prints the bootstrap admin credentials (default `admin@assetflow.local` /
`Admin@12345` unless overridden in `.env`). **You must log in as this Admin first** — self-signup
only ever creates an Employee account, by design (see Problem Statement, Screen 1).

## Architecture

```
server/
  src/
    db/
      schema.sql        # full schema: users, departments, categories, assets, allocations,
                         # transfers, bookings, maintenance, audits, notifications, logs
      index.js           # better-sqlite3 connection (WAL mode, FKs on)
    middleware/
      auth.js             # JWT issuing/verification + requireRole(...) RBAC guard
      errorHandler.js      # ApiError -> consistent JSON error responses
      upload.js            # multer disk storage for asset photos / maintenance photos
    routes/
      auth.routes.js         # signup (Employee-only), login, forgot/reset password, /me
      departments.routes.js   # Org Setup Tab A
      categories.routes.js     # Org Setup Tab B (+ dynamic custom fields per category)
      employees.routes.js       # Org Setup Tab C — the ONLY place roles are assigned
      assets.routes.js           # registration, search/filter, lifecycle transitions, history
      allocations.routes.js       # allocate/return + full transfer request workflow
      bookings.routes.js           # time-slot booking with overlap validation
      maintenance.routes.js         # Pending -> Approved -> Technician -> In Progress -> Resolved
      audits.routes.js               # cycles, auditor assignment, verify, discrepancies, close
      notifications.routes.js         # per-user notification inbox
      logs.routes.js                   # org-wide activity log (Admin/Asset Manager)
      dashboard.routes.js               # KPI cards + overdue/upcoming lists for Screen 2
      reports.routes.js                  # utilization, maintenance frequency, heatmap, etc.
    jobs/
      scheduler.js         # runs every 60s: UPCOMING->ONGOING->COMPLETED bookings,
                            # booking reminders, overdue-return notifications
    utils/helpers.js       # uuid, asset-tag generator, activity log + notification helpers
    scripts/seed.js        # bootstrap admin + demo data
    app.js / server.js
```

## Key business rules, and where they're enforced

- **No self-elevated roles**: `POST /api/auth/signup` hardcodes `role = 'EMPLOYEE'`. The only way
  to change a role is `POST /api/employees/:id/role`, which requires `ADMIN`.
- **Double-allocation prevention**: enforced twice — in application code (`allocations.routes.js`
  checks for an existing `ACTIVE` allocation before inserting) and at the database level via a
  partial unique index (`uq_allocations_one_active_per_asset`) so it holds even under concurrent
  requests. A conflicting request gets back `409` with the current holder's name and is expected
  to follow up with a Transfer Request, exactly as described in the problem statement's example.
- **Booking overlap validation**: `hasOverlap()` in `bookings.routes.js` uses the standard interval
  test (`aStart < bEnd && bStart < aEnd`), so a 10:00–11:00 request right after a 9:00–10:00 booking
  is correctly allowed.
- **Maintenance can't start without approval**: the asset only flips to `UNDER_MAINTENANCE` inside
  the `APPROVED` branch of `POST /api/maintenance/:id/decision` — never on request creation.
- **Audit discrepancies auto-generate**: any item marked `MISSING` or `DAMAGED` in
  `POST /api/audits/:id/items/:itemId/verify` immediately inserts a row into
  `audit_discrepancies`. Closing a cycle (`POST /api/audits/:id/close`) locks it and flips
  confirmed-missing assets to `LOST`.
- **Asset lifecycle transitions are whitelisted**, not free-form — see the `TRANSITIONS` map in
  `assets.routes.js`, matching the states/edges from the problem statement.

## Roles

`ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, `EMPLOYEE` — enforced per-route with
`requireRole(...roles)`. See the problem statement's Role table for what each can do; the routes
mirror that mapping directly (e.g. only `ADMIN`/`ASSET_MANAGER` can register assets and decide
maintenance requests; any authenticated user can raise one or book a resource).

## API surface (all under `/api`, JSON, Bearer JWT except `/auth/signup` and `/auth/login`)

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Departments | `GET/POST /departments`, `GET/PATCH/DELETE /departments/:id` |
| Categories | `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id` |
| Employees | `GET/POST /employees`, `GET/PATCH /employees/:id`, `POST /employees/:id/role` |
| Assets | `GET/POST /assets`, `GET/PATCH /assets/:id`, `POST /assets/:id/status` |
| Allocations | `GET/POST /allocations`, `POST /allocations/:id/return`, `GET /allocations/transfers/list`, `POST /allocations/transfers`, `POST /allocations/transfers/:id/decision` |
| Bookings | `GET/POST /bookings`, `PATCH /bookings/:id`, `POST /bookings/:id/cancel` |
| Maintenance | `GET/POST /maintenance`, `POST /maintenance/:id/decision`, `POST /maintenance/:id/assign-technician`, `POST /maintenance/:id/start`, `POST /maintenance/:id/resolve` |
| Audits | `GET/POST /audits`, `GET /audits/:id`, `POST /audits/:id/start`, `POST /audits/:id/items/:itemId/verify`, `POST /audits/:id/close`, `POST /audits/discrepancies/:id/resolve` |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Logs | `GET /logs` |
| Dashboard | `GET /dashboard` |
| Reports | `GET /reports/utilization`, `/maintenance-frequency`, `/upcoming`, `/department-allocations`, `/booking-heatmap` |

## Not yet done

The React frontend in `AssetFlow-main/` is still a static mockup with hardcoded arrays and no
`fetch` calls anywhere. This deliverable is the backend + database only. Natural next step: wire
`src/pages/Login.jsx` and `src/pages/Dashboard.jsx` to this API first (auth token in
localStorage/context, KPI cards from `GET /dashboard`), then the rest of the screens one at a time.
Happy to do that next if you'd like.
