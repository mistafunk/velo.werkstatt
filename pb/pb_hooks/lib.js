// Shared helpers for the pb_hooks. Hooks run in isolated VMs, so each
// handler loads this file with require(`${__hooks}/lib.js`).

const WEEKS_AHEAD = 12;

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

// Creates the evenings of the next weeks from the opening rules. Existing
// evenings (including ones marked closed) are left untouched.
// Returns the number of evenings created.
function generateEvenings(app, fromDate, weeks) {
  weeks = weeks || WEEKS_AHEAD;
  const rules = app.findAllRecords("opening_rules");
  const collection = app.findCollectionByNameOrId("evenings");
  const start = new Date((fromDate || isoDate(new Date())) + "T00:00:00Z");
  let created = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    const dateStr = isoDate(day);
    for (const rule of rules) {
      if (!ruleApplies(rule, dateStr)) continue;
      try {
        app.findFirstRecordByData("evenings", "date", dateStr);
        continue;
      } catch (_) {
        // not found, create it below
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
  return created;
}

module.exports = { generateEvenings, weekdayOf, isoDate };
