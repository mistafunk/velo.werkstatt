/// <reference path="../pb_data/types.d.ts" />

// Email reminders each volunteer can switch on in their profile.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new BoolField({ name: "notify_signed_up" }));
  users.fields.add(new BoolField({ name: "notify_understaffed" }));
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("notify_signed_up");
  users.fields.removeByName("notify_understaffed");
  app.save(users);
});
