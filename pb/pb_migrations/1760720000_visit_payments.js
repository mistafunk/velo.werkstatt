/// <reference path="../pb_data/types.d.ts" />

// Entry fee, material and donation of a visit are each paid on their own:
// one payment method per part instead of one for the whole visit.
// A donation is only recorded once it is given, so it is never "open".
migrate((app) => {
  const visits = app.findCollectionByNameOrId("visits");
  visits.fields.add(new SelectField({ name: "entry_payment", values: ["cash", "twint", "open"], maxSelect: 1 }));
  visits.fields.add(new SelectField({ name: "material_payment", values: ["cash", "twint", "open"], maxSelect: 1 }));
  visits.fields.add(new SelectField({ name: "donation_payment", values: ["cash", "twint"], maxSelect: 1 }));
  app.save(visits);
  for (const v of app.findAllRecords("visits")) {
    const payment = v.getString("payment");
    v.set("entry_payment", payment);
    v.set("material_payment", payment);
    v.set("donation_payment", payment === "twint" ? "twint" : "cash");
    app.save(v);
  }
  visits.fields.removeByName("payment");
  app.save(visits);
}, (app) => {
  const visits = app.findCollectionByNameOrId("visits");
  visits.fields.add(new SelectField({ name: "payment", values: ["cash", "twint", "open"], maxSelect: 1 }));
  app.save(visits);
  for (const v of app.findAllRecords("visits")) {
    v.set("payment", v.getString("entry_payment") || "open");
    app.save(v);
  }
  for (const name of ["entry_payment", "material_payment", "donation_payment"]) {
    visits.fields.removeByName(name);
  }
  app.save(visits);
});
