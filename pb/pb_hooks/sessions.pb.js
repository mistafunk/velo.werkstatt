/// <reference path="../pb_data/types.d.ts" />

// Keep the schedule filled: every night create the sessions of the next weeks.
cronAdd("generate_sessions", "0 3 * * *", () => {
  const lib = require(`${__hooks}/lib.js`);
  lib.generateSessions($app);
});

// Admins can trigger the generation right away (e.g. after changing hours).
routerAdd("POST", "/api/velo/generate-sessions", (e) => {
  const lib = require(`${__hooks}/lib.js`);
  if (!e.auth || (!e.auth.isSuperuser() && !e.auth.getBool("is_admin"))) {
    throw new ForbiddenError("Only admins can generate sessions.");
  }
  const created = lib.generateSessions($app);
  return e.json(200, { created });
}, $apis.requireAuth());

// Volunteers may edit the notes, but only admins may close a session or
// move it.
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth() && !e.auth.getBool("is_admin")) {
    const original = e.record.original();
    for (const field of ["date", "start", "end", "status", "closed_reason"]) {
      if (e.record.getString(field) !== original.getString(field)) {
        throw new ForbiddenError("Only admins can change " + field + ".");
      }
    }
  }
  e.next();
}, "sessions");
