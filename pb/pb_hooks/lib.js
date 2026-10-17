// Shared helpers for the pb_hooks. Hooks run in isolated VMs, so each
// handler loads this file with require(`${__hooks}/lib.js`).

// No nightly job, so saving the periodic sessions fills a whole year.
const WEEKS_AHEAD = 52;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// ISO weekday of a "YYYY-MM-DD" string: 1 = Monday ... 7 = Sunday.
function weekdayOf(dateStr) {
  const wd = new Date(dateStr + "T00:00:00Z").getUTCDay();
  return wd === 0 ? 7 : wd;
}

// Date ("YYYY-MM-DD") and time ("HH:MM") in Zurich. The hooks VM has no
// time zone data, so the CET/CEST switch (last Sunday of March and October,
// 01:00 UTC) is computed here.
function zurichNow(now) {
  now = now || new Date();
  const year = now.getUTCFullYear();
  const lastSunday = (month) => {
    const d = new Date(Date.UTC(year, month + 1, 0, 1));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d;
  };
  const summer = now >= lastSunday(2) && now < lastSunday(9);
  const local = new Date(now.getTime() + (summer ? 2 : 1) * 3600000);
  return { date: isoDate(local), time: local.toISOString().slice(11, 16) };
}

// Whether a session on dateStr starting at start (Zurich time) has begun.
function hasStarted(dateStr, start, now) {
  const z = zurichNow(now);
  return dateStr < z.date || (dateStr === z.date && start <= z.time);
}

// Creates the sessions of the next weeks from the periodic sessions
// (opening_rules). They always apply from now on: future sessions on a
// defined weekday get the rule's times, while sessions that have already
// started (including one running right now) are left alone. Removed sessions
// stay removed. Returns the number of sessions created and updated.
function generateSessions(app, weeks, now) {
  weeks = weeks || WEEKS_AHEAD;
  const rules = app.findAllRecords("opening_rules");
  const collection = app.findCollectionByNameOrId("sessions");
  const start = new Date(zurichNow(now).date + "T00:00:00Z");
  let created = 0;
  let updated = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    const dateStr = isoDate(day);
    for (const rule of rules) {
      if (rule.getInt("weekday") !== weekdayOf(dateStr)) continue;
      if (hasStarted(dateStr, rule.getString("start"), now)) continue;
      let existing = null;
      try {
        existing = app.findFirstRecordByData("sessions", "date", dateStr);
      } catch (_) {
        // not found, create it below
      }
      if (existing) {
        if (existing.getString("start") !== rule.getString("start") || existing.getString("end") !== rule.getString("end")) {
          existing.set("start", rule.getString("start"));
          existing.set("end", rule.getString("end"));
          app.save(existing);
          updated++;
        }
        continue;
      }
      const e = new Record(collection);
      e.set("date", dateStr);
      e.set("start", rule.getString("start"));
      e.set("end", rule.getString("end"));
      e.set("status", "open");
      app.save(e);
      created++;
    }
  }
  return { created, updated };
}

module.exports = { generateSessions, weekdayOf, isoDate, zurichNow, hasStarted };
