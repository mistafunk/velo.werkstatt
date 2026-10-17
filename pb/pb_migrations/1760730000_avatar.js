/// <reference path="../pb_data/types.d.ts" />

// Optional avatar per volunteer: small raster images only (no SVG, which can
// carry scripts), with thumbnails for the lists and the header.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const avatar = users.fields.getByName("avatar");
  avatar.mimeTypes = ["image/jpeg", "image/png", "image/webp"];
  avatar.maxSize = 2 * 1024 * 1024;
  avatar.thumbs = ["96x96", "240x240"];
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  const avatar = users.fields.getByName("avatar");
  avatar.mimeTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"];
  avatar.maxSize = 0;
  avatar.thumbs = [];
  app.save(users);
});
