# velo.werkstatt

The app that runs the community bike workshop (Velowerkstatt) at
Gemeinschaftszentrum Bachwiesen, Zurich. It is used by the volunteers on
their phones and on the workshop tablet, in German or English.

A **session** (German: Termin) is one time slot the workshop is open, usually an
evening, sometimes a Saturday afternoon.

Phase 1 (this version) is the **volunteer schedule** ("Termine"), plus a first quick visit list per session: every volunteer says
Yes or No for each session (Mon 17–20, Thu 19–21), and every
session shows whether it is staffed (at least 1, ideally 2, best 3 people)
and whether someone with a workshop key is coming. Next up are the visitor
log (entry fee, material, cash or TWINT) and later the inventory.

## How it is built

| Part | What |
|---|---|
| `pb/` | [PocketBase](https://pocketbase.io): database (SQLite), login by one-time email code, access rules, admin dashboard. Schema in `pb/pb_migrations`, server logic in `pb/pb_hooks`. |
| `web/` | [SvelteKit](https://svelte.dev/docs/kit) single page app. The build lands in `pb/pb_public` and is served by PocketBase itself. Texts in `web/src/lib/i18n/{de,en}.js`. |
| `tools/import_sheet.py` | Imports volunteers, sessions and answers from all "Wer Wann" tabs of the spreadsheet. |
| `deploy/` | Caddy and systemd files for a small Swiss VPS. |

Rules the app enforces:

- Answers are Yes or No only (no Maybe, it makes planning too uncertain). A session with people but no key holder is red. See `web/src/lib/staffing.js`.
- Volunteers can only change their own answers, name, phone, language and key flag.
- Only admins (`is_admin`) can add people, make admins, deactivate people and add, move or remove sessions. Everybody sets their own "has key" flag (admins can set it for anyone).
- Sessions for the next year (52 weeks) are created from the "Periodische Termine" whenever an admin saves them. There is no nightly job.
- The Termine list shows the next 2 weeks, then past sessions with their number of visitors and material revenue (from the visits recorded in the app, or from the imported sheet totals for older sessions).

## Development

Requires Node 22 and Python 3 (only for the import).

```sh
# 1. PocketBase (version in pb/POCKETBASE_VERSION)
cd pb
v=$(cat POCKETBASE_VERSION)
curl -sSLO "https://github.com/pocketbase/pocketbase/releases/download/v$v/pocketbase_${v}_linux_amd64.zip"  # or darwin_arm64 etc.
unzip pocketbase_*.zip pocketbase && rm pocketbase_*.zip
./pocketbase superuser upsert you@example.com 'a-long-password'
./pocketbase serve                       # http://127.0.0.1:8090/_/ is the admin dashboard

# 2. Web app with hot reload (proxies /api to PocketBase)
cd web
npm install
npm run dev                              # http://localhost:5173
```

Login sends a code by email, so set up SMTP in the PocketBase dashboard
(Settings → Mail settings). Without SMTP you can still look around: create
a volunteer in the dashboard and use "Impersonate" there.

Tests:

```sh
cd pb && node --test tests/*.test.mjs              # access rules and hooks against a throwaway PocketBase
cd web && npm run check && npm test      # types and staffing rules
python3 -m unittest discover tools       # spreadsheet importer
```

### Importing the spreadsheet

Until the switch-over the spreadsheet stays the source of truth. The
importer reads every "Wer Wann <year>" tab (2022 onwards) and can rebuild
the app's volunteers, sessions and answers from scratch at any time:

```sh
pip install openpyxl
PB_PASSWORD='superuser-password' python3 tools/import_sheet.py Einsatzdaten.xlsx \
  --url http://127.0.0.1:8090 --admin-email you@example.com \
  --reset --admins "Your name" --key-holders "Name 1,Name 2,..."
```

- `--reset` deletes all volunteers, sessions and answers first. Without it,
  existing records are updated (volunteers by name, sessions by date).
- `--admins` and `--key-holders` take first names as they appear in the
  sheet. Without `--key-holders`, the yellow names of the latest tab get a key.
- Money and visitor numbers of each session are kept in `sheet_totals`.
- Volunteers without an email in the "Team Email" tab get a placeholder
  address (`…@example.invalid`); fix it on their page before they can log in.

Volunteer names and contact data only live in the spreadsheet and the app's
database, never in this repository.

The importer's own tests: `python3 -m unittest discover tools`.

### Opening hours

There is no separate page: admins see an admin mode of the "Termine" list.
Each card in "Nächste 2 Wochen" has a ✕ button to remove the session
("Termin entfernen", also in the session view). Removing
only marks the session as removed, so creating sessions again does not bring it
back; admins still see it greyed out and can restore it. Below the next
two weeks, a section "Termine verwalten" adds single extra sessions
("+ Termin") and holds the "Periodische Termine" (weekday and time) in a
folded box. They always apply from now on: changing them retimes all
future sessions on that weekday right away, except a session that has
already started (Zurich time). A single session cannot be retimed. Only a single session on a day they do not cover (e.g. a
Saturday) gets its own times when it is added.

## Hosting

One small VPS at a Swiss provider (e.g. Infomaniak), about CHF 5–10 per month.

1. Create a user `velo` and the folder `/opt/velo-werkstatt`.
2. Copy the `pocketbase` binary (linux_amd64), `pb/pb_migrations`, `pb/pb_hooks` and the built `pb/pb_public` there (`cd web && npm ci && npm run build`).
3. Install `deploy/velo-werkstatt.service` and start it; install Caddy with `deploy/Caddyfile` and your domain.
4. Open `https://your-domain/_/`, create the superuser, set SMTP (Infomaniak mail works), the app URL, and enable backups (Settings → Backups, ideally to S3-compatible Swiss storage).

Updates: copy the new files and `systemctl restart velo-werkstatt`;
migrations run automatically on start.

## Licence

[GNU Affero General Public License v3.0](LICENSE). The code is meant to be
public (on Codeberg), so it must never contain personal data: volunteer and
visitor data only live in the app's database.
