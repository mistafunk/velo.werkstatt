/// <reference path="../pb_data/types.d.ts" />

// Keep the schedule filled: every night create the evenings of the next weeks.
cronAdd("generate_evenings", "0 3 * * *", () => {
  const lib = require(`${__hooks}/lib.js`);
  lib.generateEvenings($app);
});

// Admins can trigger the generation right away (e.g. after changing hours).
routerAdd("POST", "/api/velo/generate-evenings", (e) => {
  const lib = require(`${__hooks}/lib.js`);
  if (!e.auth || (!e.auth.isSuperuser() && !e.auth.getBool("is_admin"))) {
    throw new ForbiddenError("Only admins can generate evenings.");
  }
  const created = lib.generateEvenings($app);
  return e.json(200, { created });
}, $apis.requireAuth());

// Volunteers may set the lead and notes, but only admins may close an
// evening or move it.
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
}, "evenings");
