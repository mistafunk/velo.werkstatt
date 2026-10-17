/// <reference path="../pb_data/types.d.ts" />

// Money and visitor figures per evening as recorded in the old spreadsheet
// (total, cash, twint, material, visitors), kept for the statistics.
migrate((app) => {
  const evenings = app.findCollectionByNameOrId("evenings");
  evenings.fields.add(new JSONField({ name: "sheet_totals" }));
  app.save(evenings);
}, (app) => {
  const evenings = app.findCollectionByNameOrId("evenings");
  evenings.fields.removeByName("sheet_totals");
  app.save(evenings);
});
