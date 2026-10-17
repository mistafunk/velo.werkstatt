/// <reference path="../pb_data/types.d.ts" />

// Whoever records a visit is noted as recorder; volunteers cannot fake it.
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    e.record.set("recorded_by", e.auth.id);
  }
  e.next();
}, "visits");
