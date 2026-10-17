/// <reference path="../pb_data/types.d.ts" />

// Money and visitor figures per session as recorded in the old spreadsheet
// (total, cash, twint, material, visitors), kept for the statistics.
migrate((app) => {
  const sessions = app.findCollectionByNameOrId("sessions");
  sessions.fields.add(new JSONField({ name: "sheet_totals" }));
  app.save(sessions);
}, (app) => {
  const sessions = app.findCollectionByNameOrId("sessions");
  sessions.fields.removeByName("sheet_totals");
  app.save(sessions);
});
