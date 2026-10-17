/// <reference path="../pb_data/types.d.ts" />

// Only admins may hand out keys, admin rights or (de)activate volunteers.
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth() && !e.auth.getBool("is_admin")) {
    const original = e.record.original();
    for (const field of ["has_key", "is_admin", "active", "email"]) {
      if (e.record.getString(field) !== original.getString(field)) {
        throw new ForbiddenError("Only admins can change " + field + ".");
      }
    }
  }
  e.next();
}, "users");

// New volunteers are active unless stated otherwise. They log in with a
// one-time code, so they get a random password nobody needs to know.
onRecordCreateRequest((e) => {
  const body = e.requestInfo().body;
  if (!body.hasOwnProperty("active")) {
    e.record.set("active", true);
  }
  if (!body.password) {
    e.record.setRandomPassword();
  }
  e.next();
}, "users");

// Former volunteers can no longer log in.
onRecordAuthRequest((e) => {
  if (!e.record.getBool("active")) {
    throw new ForbiddenError("This account is inactive.");
  }
  e.next();
}, "users");
