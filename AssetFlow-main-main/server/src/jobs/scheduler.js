const { db } = require('../db');
const { uuid, notify, notifyMany, getUserIdsByRole } = require('../utils/helpers');

/** Flip UPCOMING bookings whose start_time has passed into ONGOING, and ONGOING -> COMPLETED past end_time. */
function transitionBookings() {
  db.prepare(`UPDATE bookings SET status = 'ONGOING', updated_at = datetime('now')
              WHERE status = 'UPCOMING' AND start_time <= datetime('now') AND end_time > datetime('now')`).run();
  db.prepare(`UPDATE bookings SET status = 'COMPLETED', updated_at = datetime('now')
              WHERE status IN ('UPCOMING','ONGOING') AND end_time <= datetime('now')`).run();
}

/** Sends a one-time reminder notification ~15 minutes before a booking starts. */
function sendBookingReminders() {
  const upcoming = db.prepare(
    `SELECT * FROM bookings WHERE status = 'UPCOMING' AND reminder_sent = 0
       AND start_time <= datetime('now', '+15 minutes') AND start_time > datetime('now')`
  ).all();
  for (const b of upcoming) {
    const asset = db.prepare('SELECT name FROM assets WHERE id = ?').get(b.asset_id);
    notify({
      userId: b.booked_by, type: 'BOOKING_REMINDER', title: 'Booking starting soon',
      message: `${asset?.name || 'Your resource'} booking starts at ${b.start_time}.`,
      entityType: 'booking', entityId: b.id,
    });
    db.prepare('UPDATE bookings SET reminder_sent = 1 WHERE id = ?').run(b.id);
  }
}

/** Notifies asset holders (once per day) about overdue returns. */
function notifyOverdueReturns() {
  const overdue = db.prepare(
    `SELECT al.*, a.name AS asset_name, a.asset_tag FROM allocations al
     JOIN assets a ON a.id = al.asset_id
     WHERE al.status = 'ACTIVE' AND al.expected_return_date IS NOT NULL AND al.expected_return_date < datetime('now')`
  ).all();
  for (const al of overdue) {
    // Avoid spamming: only notify if no OVERDUE_RETURN notification exists for this allocation in the last 24h.
    const recent = db.prepare(
      `SELECT 1 FROM notifications WHERE entity_type = 'allocation' AND entity_id = ? AND type = 'OVERDUE_RETURN'
         AND created_at > datetime('now', '-24 hours')`
    ).get(al.id);
    if (recent) continue;
    if (al.allocated_to_user_id) {
      notify({
        userId: al.allocated_to_user_id, type: 'OVERDUE_RETURN', title: 'Overdue asset return',
        message: `${al.asset_name} (${al.asset_tag}) was due back on ${al.expected_return_date}.`,
        entityType: 'allocation', entityId: al.id,
      });
    }
    notifyMany(getUserIdsByRole(['ASSET_MANAGER']), {
      type: 'OVERDUE_RETURN', title: 'Overdue asset return', entityType: 'allocation', entityId: al.id,
      message: `${al.asset_name} (${al.asset_tag}) is overdue for return.`,
    });
  }
}

function runTick() {
  try {
    transitionBookings();
    sendBookingReminders();
    notifyOverdueReturns();
  } catch (err) {
    console.error('[scheduler] tick failed:', err.message);
  }
}

function startScheduler(intervalMs = 60 * 1000) {
  runTick();
  return setInterval(runTick, intervalMs);
}

module.exports = { startScheduler, runTick };
