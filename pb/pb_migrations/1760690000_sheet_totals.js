/// <reference path="../pb_data/types.d.ts" />

// Money and visitor figures per opening as recorded in the old spreadsheet
// (total, cash, twint, material, visitors), kept for the statistics.
migrate((app) => {
  const openings = app.findCollectionByNameOrId("openings");
  openings.fields.add(new JSONField({ name: "sheet_totals" }));
  app.save(openings);
}, (app) => {
  const openings = app.findCollectionByNameOrId("openings");
  openings.fields.removeByName("sheet_totals");
  app.save(openings);
});
