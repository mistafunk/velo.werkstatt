/// <reference path="../pb_data/types.d.ts" />

// There is no nightly job: sessions are created when an admin saves the
// periodic sessions or opens the Termine list (which calls this route).
routerAdd("POST", "/api/velo/generate-sessions", (e) => {
  const lib = require(`${__hooks}/lib.js`);
  if (!e.auth || (!e.auth.isSuperuser() && !e.auth.getBool("is_admin"))) {
    throw new ForbiddenError("Only admins can generate sessions.");
  }
  return e.json(200, lib.generateSessions($app));
}, $apis.requireAuth());

// A changed session definition applies right away.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib.js`).generateSessions(e.app);
  e.next();
}, "opening_rules");

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/lib.js`).generateSessions(e.app);
  e.next();
}, "opening_rules");

// Volunteers may edit the notes, but only admins may remove a session.
// Nobody moves a single session: its times come from the session
// definition (opening_rules).
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    const fields = e.auth.getBool("is_admin") ? ["date", "start", "end"] : ["date", "start", "end", "status", "closed_reason"];
    const original = e.record.original();
    for (const field of fields) {
      if (e.record.getString(field) !== original.getString(field)) {
        throw new ForbiddenError("Only admins can change " + field + ".");
      }
    }
  }
  e.next();
}, "sessions");
