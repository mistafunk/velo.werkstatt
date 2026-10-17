// Integration tests for the access rules and hooks. Starts a throwaway
// PocketBase with the repo's migrations and hooks.
// Run from pb/: node --test tests/*.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PB = process.env.PB_BIN || "./pocketbase";
const PORT = 8190 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
let dir, proc, superToken;

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function createVolunteer(name, extra = {}) {
  const r = await api("POST", "/api/collections/users/records", superToken, {
    email: `${name}@example.com`, name, ...extra,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const imp = await api("POST", `/api/collections/users/impersonate/${r.body.id}`, superToken, {});
  assert.equal(imp.status, 200, JSON.stringify(imp.body));
  return { id: r.body.id, token: imp.body.token };
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "velo-pb-"));
  const args = ["--dir", dir, "--migrationsDir", "pb_migrations", "--hooksDir", "pb_hooks"];
  execFileSync(PB, ["migrate", "up", ...args]);
  execFileSync(PB, ["superuser", "upsert", "root@example.com", "testtest123", ...args]);
  proc = spawn(PB, ["serve", "--http", `127.0.0.1:${PORT}`, ...args], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + "/api/health")).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const auth = await api("POST", "/api/collections/_superusers/auth-with-password", null, {
    identity: "root@example.com", password: "testtest123",
  });
  superToken = auth.body.token;
});

after(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

test("default opening hours are seeded and sessions get generated", async () => {
  const rules = await api("GET", "/api/collections/opening_rules/records?sort=weekday", superToken);
  assert.deepEqual(rules.body.items.map((r) => [r.weekday, r.start, r.end]), [[1, "17:00", "20:00"], [4, "19:00", "21:00"]]);
  // The seeded rules already generated their sessions.
  const sessions = await api("GET", "/api/collections/sessions/records?perPage=1", superToken);
  assert.equal(sessions.body.totalItems, 24);
  const again = await api("POST", "/api/velo/generate-sessions", superToken, {});
  assert.equal(again.body.created, 0, "existing sessions are not duplicated");
});

test("volunteers manage only their own answers", async () => {
  const anna = await createVolunteer("anna");
  const beat = await createVolunteer("beat");
  const ev = (await api("GET", "/api/collections/sessions/records?sort=date&perPage=1", anna.token)).body.items[0];

  const own = await api("POST", "/api/collections/availability/records", anna.token, { session: ev.id, volunteer: anna.id, answer: "yes" });
  assert.equal(own.status, 200);
  const other = await api("POST", "/api/collections/availability/records", anna.token, { session: ev.id, volunteer: beat.id, answer: "yes" });
  assert.equal(other.status, 400);
  const dup = await api("POST", "/api/collections/availability/records", anna.token, { session: ev.id, volunteer: anna.id, answer: "no" });
  assert.equal(dup.status, 400, "one answer per volunteer and session");
  const change = await api("PATCH", `/api/collections/availability/records/${own.body.id}`, anna.token, { answer: "no" });
  assert.equal(change.status, 200);
  const maybe = await api("PATCH", `/api/collections/availability/records/${own.body.id}`, anna.token, { answer: "maybe" });
  assert.equal(maybe.status, 400, "there is no maybe");
  const steal = await api("PATCH", `/api/collections/availability/records/${own.body.id}`, beat.token, { answer: "no" });
  assert.equal(steal.status, 404);
  const hijack = await api("PATCH", `/api/collections/availability/records/${own.body.id}`, anna.token, { volunteer: beat.id });
  assert.equal(hijack.status, 404);
});

test("volunteers set their own key flag, only admins remove sessions", async () => {
  const carla = await createVolunteer("carla");
  const boss = await createVolunteer("boss", { is_admin: true });

  const selfName = await api("PATCH", `/api/collections/users/records/${carla.id}`, carla.token, { name: "Carla B.", lang: "en" });
  assert.equal(selfName.status, 200);
  const selfKey = await api("PATCH", `/api/collections/users/records/${carla.id}`, carla.token, { has_key: true });
  assert.equal(selfKey.status, 200);
  assert.equal(selfKey.body.has_key, true);
  const otherKey = await api("PATCH", `/api/collections/users/records/${boss.id}`, carla.token, { has_key: true });
  assert.equal(otherKey.status, 404, "only their own key flag");
  const selfAdmin = await api("PATCH", `/api/collections/users/records/${carla.id}`, carla.token, { is_admin: true });
  assert.equal(selfAdmin.status, 403);

  const ev = (await api("GET", "/api/collections/sessions/records?sort=date&perPage=1", carla.token)).body.items[0];
  const notes = await api("PATCH", `/api/collections/sessions/records/${ev.id}`, carla.token, { notes: "Pumpe defekt" });
  assert.equal(notes.status, 200);
  const close = await api("PATCH", `/api/collections/sessions/records/${ev.id}`, carla.token, { status: "closed" });
  assert.equal(close.status, 403);
  const adminClose = await api("PATCH", `/api/collections/sessions/records/${ev.id}`, boss.token, { status: "closed", closed_reason: "Feiertag" });
  assert.equal(adminClose.status, 200);
  const newUser = await api("POST", "/api/collections/users/records", carla.token, { email: "x@example.com" });
  assert.equal(newUser.status, 400);
  const gen = await api("POST", "/api/velo/generate-sessions", carla.token, {});
  assert.equal(gen.status, 403);
});

test("inactive volunteers cannot log in and guests see nothing", async () => {
  const r = await api("POST", "/api/collections/users/records", superToken, { email: "dora@example.com", name: "dora", active: false });
  assert.equal(r.status, 200);
  const imp = await api("POST", `/api/collections/users/impersonate/${r.body.id}`, superToken, {});
  assert.equal(imp.status, 403);
  const users = await api("GET", "/api/collections/users/records", null);
  assert.equal(users.body.items.length, 0);
  const sessions = await api("GET", "/api/collections/sessions/records", null);
  assert.equal(sessions.body.items.length, 0);
});

test("only admins edit opening hours and add or delete sessions", async () => {
  const erin = await createVolunteer("erin");
  const admin = await createVolunteer("admin2", { is_admin: true });
  const rule = { weekday: 6, start: "10:00", end: "13:00" };
  assert.equal((await api("POST", "/api/collections/opening_rules/records", erin.token, rule)).status, 400);
  const created = await api("POST", "/api/collections/opening_rules/records", admin.token, rule);
  assert.equal(created.status, 200);
  const changed = await api("PATCH", `/api/collections/opening_rules/records/${created.body.id}`, erin.token, { start: "09:00" });
  assert.equal(changed.status, 404);

  const extra = { date: "2027-03-06", start: "10:00", end: "13:00", status: "open" };
  assert.equal((await api("POST", "/api/collections/sessions/records", erin.token, extra)).status, 400);
  const ev = await api("POST", "/api/collections/sessions/records", admin.token, extra);
  assert.equal(ev.status, 200);
  const moved = await api("PATCH", `/api/collections/sessions/records/${ev.body.id}`, erin.token, { start: "11:00" });
  assert.equal(moved.status, 403);
  const retimed = await api("PATCH", `/api/collections/sessions/records/${ev.body.id}`, admin.token, { start: "11:00" });
  assert.equal(retimed.status, 403, "times come from the session definition");
  assert.equal((await api("DELETE", `/api/collections/sessions/records/${ev.body.id}`, erin.token)).status, 404);
  assert.equal((await api("DELETE", `/api/collections/sessions/records/${ev.body.id}`, admin.token)).status, 204);
});

test("generated sessions respect valid_from and valid_to", async () => {
  const before = (await api("GET", "/api/collections/sessions/records?perPage=1", superToken)).body.totalItems;
  const from = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 27 * 86400000).toISOString().slice(0, 10);
  await api("POST", "/api/collections/opening_rules/records", superToken, { weekday: 3, start: "18:00", end: "20:00", valid_from: from, valid_to: to });
  // Saving the rule generates its sessions right away.
  const wednesdays = await api("GET", `/api/collections/sessions/records?filter=${encodeURIComponent("start = '18:00'")}`, superToken);
  assert.equal(wednesdays.body.totalItems, 2);
  assert.ok(wednesdays.body.items.every((e) => e.date >= from && e.date <= to));
  assert.ok(before > 0);
});

test("changing the session definition retimes the upcoming sessions", async () => {
  const mondayFilter = encodeURIComponent("start = '17:00' && end = '20:00' && date < '2030-01-01'");
  const rule = (await api("GET", `/api/collections/opening_rules/records?filter=${encodeURIComponent("weekday = 1")}`, superToken)).body.items[0];
  const mondays = (await api("GET", `/api/collections/sessions/records?filter=${mondayFilter}&perPage=100`, superToken)).body.items;
  assert.equal(mondays.length, 12);
  const changed = await api("PATCH", `/api/collections/opening_rules/records/${rule.id}`, superToken, { start: "18:00" });
  assert.equal(changed.status, 200);
  for (const m of mondays) {
    const now = (await api("GET", `/api/collections/sessions/records/${m.id}`, superToken)).body;
    assert.deepEqual([now.start, now.end, now.status], ["18:00", "20:00", m.status], m.date);
  }
});

test("volunteers record visits, the recorder is set by the server", async () => {
  const vera = await createVolunteer("vera");
  const other = await createVolunteer("otto");
  const ev = await api("POST", "/api/collections/sessions/records", superToken, { date: "2031-03-03", start: "17:00", end: "20:00", status: "open" });
  const visit = await api("POST", "/api/collections/visits/records", vera.token, {
    session: ev.body.id, entry_fee: 5, material: 10, payment: "twint", contact: "079 000 00 00", recorded_by: other.id,
  });
  assert.equal(visit.status, 200, JSON.stringify(visit.body));
  assert.equal(visit.body.recorded_by, vera.id);
  assert.equal(visit.body.no, 1);
  assert.equal(visit.body.created, undefined, "no timestamps on visits");
  const second = await api("POST", "/api/collections/visits/records", other.token, { session: ev.body.id, entry_fee: 5, payment: "cash" });
  assert.equal(second.body.no, 2);
  const paid = await api("PATCH", `/api/collections/visits/records/${visit.body.id}`, other.token, { payment: "cash" });
  assert.equal(paid.status, 200);
  const negative = await api("POST", "/api/collections/visits/records", vera.token, { session: ev.body.id, entry_fee: -5, payment: "cash" });
  assert.equal(negative.status, 400);
  assert.equal((await api("GET", "/api/collections/visits/records", null)).body.totalItems, 0, "guests see no visits");
});
