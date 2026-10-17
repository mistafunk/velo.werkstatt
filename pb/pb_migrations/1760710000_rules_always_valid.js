/// <reference path="../pb_data/types.d.ts" />

// Periodic sessions always apply from now on, so they have no validity range.
migrate((app) => {
  const rules = app.findCollectionByNameOrId("opening_rules");
  rules.fields.removeByName("valid_from");
  rules.fields.removeByName("valid_to");
  app.save(rules);
}, (app) => {
  const rules = app.findCollectionByNameOrId("opening_rules");
  rules.fields.add(new DateField({ name: "valid_from" }));
  rules.fields.add(new DateField({ name: "valid_to" }));
  app.save(rules);
});
