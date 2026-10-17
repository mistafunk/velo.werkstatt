/// <reference path="../pb_data/types.d.ts" />

// Email reminders volunteers switch on in their profile, sent every morning
// (06:00 UTC, so 07:00 or 08:00 in Zurich).
cronAdd("velo-reminders", "0 6 * * *", () => {
  require(`${__hooks}/lib.js`).sendReminders($app);
});

// Admins (and the tests) can see which reminders a given day would send.
routerAdd("GET", "/api/velo/reminders", (e) => {
  if (!e.auth || (!e.auth.isSuperuser() && !e.auth.getBool("is_admin"))) {
    throw new ForbiddenError("Only admins can list reminders.");
  }
  const lib = require(`${__hooks}/lib.js`);
  const today = e.request.url.query().get("today") || lib.zurichNow().date;
  return e.json(200, lib.dueReminders($app, today).map((r) => ({
    kind: r.kind, session: r.session.id, date: r.session.getString("date"), volunteer: r.volunteer.id,
  })));
}, $apis.requireAuth());
