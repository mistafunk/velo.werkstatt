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

function ruleApplies(rule, dateStr) {
  if (rule.getInt("weekday") !== weekdayOf(dateStr)) return false;
  const from = rule.getString("valid_from").slice(0, 10);
  const to = rule.getString("valid_to").slice(0, 10);
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

// Creates the sessions of the next weeks from the opening rules (the
// session definition). Times come from the definition only, so existing
// sessions on a defined weekday get the rule's times. Removed sessions stay
// removed. Returns the number of sessions created and updated.
function generateSessions(app, fromDate, weeks) {
  weeks = weeks || WEEKS_AHEAD;
  const rules = app.findAllRecords("opening_rules");
  const collection = app.findCollectionByNameOrId("sessions");
  const start = new Date((fromDate || isoDate(new Date())) + "T00:00:00Z");
  let created = 0;
  let updated = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    const dateStr = isoDate(day);
    for (const rule of rules) {
      if (!ruleApplies(rule, dateStr)) continue;
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

module.exports = { generateSessions, weekdayOf, isoDate };
