// Unit tests for the plain helpers in pb_hooks/lib.js.
// Run from pb/: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { zurichNow, hasStarted } = createRequire(import.meta.url)("../pb_hooks/lib.js");

test("Zurich time follows CET and CEST", () => {
  assert.deepEqual(zurichNow(new Date("2026-01-15T16:30:00Z")), { date: "2026-01-15", time: "17:30" });
  assert.deepEqual(zurichNow(new Date("2026-07-15T16:30:00Z")), { date: "2026-07-15", time: "18:30" });
  // CEST ends on the last Sunday of October at 01:00 UTC.
  assert.equal(zurichNow(new Date("2026-10-25T00:59:00Z")).time, "02:59");
  assert.equal(zurichNow(new Date("2026-10-25T01:00:00Z")).time, "02:00");
  assert.equal(zurichNow(new Date("2026-12-31T23:30:00Z")).date, "2027-01-01");
});

test("sessions that have started are left alone", () => {
  const monday1745 = new Date("2026-10-19T15:45:00Z"); // 17:45 in Zurich
  assert.equal(hasStarted("2026-10-19", "17:00", monday1745), true, "running right now");
  assert.equal(hasStarted("2026-10-19", "18:00", monday1745), false, "later today");
  assert.equal(hasStarted("2026-10-18", "17:00", monday1745), true, "yesterday");
  assert.equal(hasStarted("2026-10-22", "19:00", monday1745), false, "later this week");
});
