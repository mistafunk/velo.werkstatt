/// <reference path="../pb_data/types.d.ts" />

// Whoever records a visit is noted as recorder; volunteers cannot fake it.
// Visits get the next number within their session instead of a timestamp.
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    e.record.set("recorded_by", e.auth.id);
  }
  const last = e.app.findRecordsByFilter("visits", "session = {:s}", "-no", 1, 0, { s: e.record.getString("session") });
  e.record.set("no", last.length ? last[0].getInt("no") + 1 : 1);
  e.next();
}, "visits");
