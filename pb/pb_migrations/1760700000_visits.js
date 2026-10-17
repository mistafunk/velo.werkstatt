/// <reference path="../pb_data/types.d.ts" />

// Visitor log: one row per visit during a session. Visitors stay anonymous;
// label and contact are optional, e.g. for open debts or a bike left behind.
// On purpose no time is stored (no arrival, no duration, no timestamps):
// "no" only keeps the visits of a session in the order they were recorded.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const sessions = app.findCollectionByNameOrId("sessions");
  const authed = '@request.auth.id != ""';
  const money = (name) => ({ type: "number", name, min: 0 });
  const visits = new Collection({
    type: "base",
    name: "visits",
    listRule: authed,
    viewRule: authed,
    createRule: authed,
    updateRule: authed,
    deleteRule: authed,
    fields: [
      { type: "relation", name: "session", collectionId: sessions.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "number", name: "no", onlyInt: true, min: 1 },
      { type: "text", name: "label" },
      { type: "text", name: "contact" },
      money("entry_fee"),
      money("material"),
      money("donation"),
      { type: "select", name: "payment", values: ["cash", "twint", "open"], maxSelect: 1, required: true },
      { type: "relation", name: "recorded_by", collectionId: users.id, maxSelect: 1 },
      { type: "text", name: "notes" },
    ],
    indexes: ["CREATE INDEX idx_visits_session ON visits (session)"],
  });
  app.save(visits);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("visits"));
});
