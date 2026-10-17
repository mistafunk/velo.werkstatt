/// <reference path="../pb_data/types.d.ts" />

// Schema for phase 1: volunteers (the built-in users collection),
// opening rules, sessions and availability answers.
migrate((app) => {
  const authed = "@request.auth.id != ''";
  const admin = "@request.auth.is_admin = true";

  // --- volunteers --------------------------------------------------------
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new TextField({ name: "phone" }));
  users.fields.add(new BoolField({ name: "has_key" }));
  users.fields.add(new BoolField({ name: "is_admin" }));
  users.fields.add(new BoolField({ name: "active" }));
  users.fields.add(new SelectField({ name: "lang", values: ["de", "en"], maxSelect: 1 }));
  // Login with a one-time code sent by email; no passwords to forget.
  users.otp.enabled = true;
  users.otp.duration = 600;
  users.otp.length = 6;
  users.passwordAuth.enabled = false;
  users.listRule = authed;
  users.viewRule = authed;
  users.createRule = admin;
  // Everybody may edit their own name, phone, language and key flag. Only
  // admins may change the admin and active flags (checked in pb_hooks/volunteers.pb.js).
  users.updateRule = "id = @request.auth.id || " + admin;
  users.deleteRule = admin;
  app.save(users);

  // --- opening rules -----------------------------------------------------
  const rules = new Collection({
    type: "base",
    name: "opening_rules",
    listRule: authed,
    viewRule: authed,
    createRule: admin,
    updateRule: admin,
    deleteRule: admin,
    fields: [
      // 1 = Monday ... 7 = Sunday
      { type: "number", name: "weekday", required: true, min: 1, max: 7, onlyInt: true },
      { type: "text", name: "start", required: true, pattern: "^\\d{2}:\\d{2}$" },
      { type: "text", name: "end", required: true, pattern: "^\\d{2}:\\d{2}$" },
      { type: "date", name: "valid_from" },
      { type: "date", name: "valid_to" },
    ],
  });
  app.save(rules);

  // --- sessions ----------------------------------------------------------
  const sessions = new Collection({
    type: "base",
    name: "sessions",
    listRule: authed,
    viewRule: authed,
    createRule: admin,
    // Any volunteer can edit the notes; closing is admin only (hook).
    updateRule: authed,
    deleteRule: admin,
    fields: [
      // ISO date "YYYY-MM-DD", kept as text so time zones never shift it.
      { type: "text", name: "date", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      { type: "text", name: "start", required: true, pattern: "^\\d{2}:\\d{2}$" },
      { type: "text", name: "end", required: true, pattern: "^\\d{2}:\\d{2}$" },
      { type: "select", name: "status", values: ["open", "closed"], maxSelect: 1, required: true },
      { type: "text", name: "closed_reason" },
      { type: "text", name: "notes" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_sessions_date ON sessions (date)"],
  });
  app.save(sessions);

  // --- availability ------------------------------------------------------
  const own = "(volunteer = @request.auth.id || " + admin + ")";
  const availability = new Collection({
    type: "base",
    name: "availability",
    listRule: authed,
    viewRule: authed,
    createRule: "@request.body.volunteer = @request.auth.id || " + admin,
    updateRule: own + " && (@request.body.volunteer:isset = false || @request.body.volunteer = volunteer)",
    deleteRule: own,
    fields: [
      { type: "relation", name: "session", collectionId: sessions.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "relation", name: "volunteer", collectionId: users.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "select", name: "answer", values: ["yes", "no"], maxSelect: 1, required: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_availability_pair ON availability (session, volunteer)"],
  });
  app.save(availability);

  // Default opening hours: Monday 17-20, Thursday 19-21.
  for (const [weekday, start, end] of [[1, "17:00", "20:00"], [4, "19:00", "21:00"]]) {
    const r = new Record(rules);
    r.set("weekday", weekday);
    r.set("start", start);
    r.set("end", end);
    app.save(r);
  }
}, (app) => {
  for (const name of ["availability", "sessions", "opening_rules"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
  const users = app.findCollectionByNameOrId("users");
  for (const name of ["phone", "has_key", "is_admin", "active", "lang"]) {
    users.fields.removeByName(name);
  }
  users.passwordAuth.enabled = true;
  users.otp.enabled = false;
  app.save(users);
});
