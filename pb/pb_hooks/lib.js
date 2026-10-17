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

// A session lacks volunteers unless at least two come and one of them has a
// key (the same rule as the red and amber badges in the app).
function lacksVolunteers(yes, hasKey) {
  return yes < 2 || !hasKey;
}

// The reminder emails due on `today` (Zurich date, "YYYY-MM-DD"):
// - "signed_up": the day before a session, to everyone who said Yes and
//   wants this reminder;
// - "understaffed": a week before a session that lacks volunteers, to
//   everyone who wants this reminder and has not said Yes yet.
// Returns [{ kind, session, volunteer }] with records.
function dueReminders(app, today) {
  const day = (n) => isoDate(new Date(new Date(today + "T00:00:00Z").getTime() + n * 86400000));
  const people = app.findRecordsByFilter("users", "active = true", "name", 0, 0);
  const due = [];
  for (const [kind, offset] of [["signed_up", 1], ["understaffed", 7]]) {
    const sessions = app.findRecordsByFilter("sessions", "date = {:date} && status = 'open'", "", 0, 0, { date: day(offset) });
    for (const session of sessions) {
      const yes = app.findRecordsByFilter("availability", "session = {:id} && answer = 'yes'", "", 0, 0, { id: session.id })
        .map((a) => a.getString("volunteer"));
      const coming = people.filter((v) => yes.includes(v.id));
      if (kind === "signed_up") {
        for (const v of coming) if (v.getBool("notify_signed_up")) due.push({ kind, session, volunteer: v });
      } else if (lacksVolunteers(coming.length, coming.some((v) => v.getBool("has_key")))) {
        for (const v of people) if (v.getBool("notify_understaffed") && !yes.includes(v.id)) due.push({ kind, session, volunteer: v });
      }
    }
  }
  return due;
}

const REMINDER_TEXTS = {
  de: {
    signed_up: ["Erinnerung: morgen in der Velowerkstatt", "Du hast dich für morgen eingetragen: {date}, {start}–{end}. Danke!"],
    understaffed: ["Freiwillige gesucht: {date}", "Für den Termin am {date}, {start}–{end}, haben sich noch zu wenige Freiwillige eingetragen. Kannst du kommen?"],
    open: "Termin öffnen",
    footer: "Du bekommst diese E-Mail, weil du sie in deinem Profil eingeschaltet hast.",
  },
  en: {
    signed_up: ["Reminder: workshop tomorrow", "You signed up for tomorrow: {date}, {start}–{end}. Thank you!"],
    understaffed: ["Volunteers needed: {date}", "The session on {date}, {start}–{end}, does not have enough volunteers yet. Can you come?"],
    open: "Open the session",
    footer: "You get this email because you switched it on in your profile.",
  },
};

// Sends the reminders due today and returns how many were sent.
function sendReminders(app, now) {
  const meta = app.settings().meta;
  let sent = 0;
  for (const r of dueReminders(app, zurichNow(now).date)) {
    const lang = r.volunteer.getString("lang") === "en" ? "en" : "de";
    const texts = REMINDER_TEXTS[lang];
    const fill = (text) => text
      .replace("{date}", r.session.getString("date").split("-").reverse().join("."))
      .replace("{start}", r.session.getString("start"))
      .replace("{end}", r.session.getString("end"));
    const [subject, body] = texts[r.kind];
    const link = `${meta.appURL}/session/${r.session.id}`;
    try {
      app.newMailClient().send(new MailerMessage({
        from: { address: meta.senderAddress, name: meta.senderName },
        to: [{ address: r.volunteer.email() }],
        subject: fill(subject),
        html: `<p>${fill(body)}</p><p><a href="${link}">${texts.open}</a></p><p style="color:#777">${texts.footer}</p>`,
      }));
      sent++;
    } catch (err) {
      app.logger().error("Reminder email failed", "volunteer", r.volunteer.id, "error", String(err));
    }
  }
  return sent;
}

module.exports = { generateSessions, weekdayOf, isoDate, zurichNow, hasStarted, lacksVolunteers, dueReminders, sendReminders };
