# Spec: Admin-editable emergency hotlines

Status: APPROVED 2026-11-22 with changes (folded in below). Branch `feat/emergency-contacts` (from origin/main 3c62eb2).
Fixes audit findings P3-01, P4-01, V-01 (`scratch/audit-2026-11-21/`).

## Objective

Admins (head MDRRMO, MDRRMO, system, super) can edit the hotlines that residents and visitors see. Every
place that shows or dials a hotline reads one list from the server. The visible number and the `tel:`
target come from the same stored value. The numbers stay samples for now. A sample row is shown to
everyone as plain text tagged "Sample, not yet configured" and is never a `tel:` link, for any role.
Only non-sample rows can be dialled.

## Current state (origin/main)

`client/src/constants/hotlines.js` already sets `tel` from `number`, so V-01 (label and dialled number
disagree) and the P4-01 duplicate key are fixed in code. Hardcoded numbers are still in:

| File | What it has |
|---|---|
| `client/src/constants/hotlines.js` | sample `0987 654 3210` x3, `911` |
| `client/src/pages/public/LandingPage.jsx:109-121` | hero "MDRRMO 24/7 hotline", Globe + Smart |
| `client/src/components/ui/landing/LandingFooter.jsx:10-17` | MDRRMO Globe/Smart, BFP |
| `client/src/components/ui/dashboard/DashboardEmergencyContacts.jsx:16-21` | 4 contacts |
| `client/src/pages/user/announcements/InEffectNow.jsx:7` | `Call 911` (not in the audit) |
| `client/src/components/ui/PortalFooter.jsx:31` | `911 / (045) 900-0199` (not in the audit; a 6th number, unverified) |
| `client/public/termly-privacy.html` | `+63 123 456 7890` in the privacy policy (out of scope; tracked in TECH_DEBT.md) |

## Decisions

### Storage: a table (recommended), not a system_settings JSON row

- Each row gets DB-level CHECK constraints (lengths, phone characters). A JSON string in
  `system_settings.value` (type `text`) has none, so bad data is caught only by the API.
- `updated_by` / `updated_at` per row come for free. `system_settings` has `updated_at` per key only.
- The public endpoint is a plain `SELECT`. With JSON, every read would parse and re-check it.
- The cost is one more table and one migration block. That is small for at most 15 rows.

```sql
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency      varchar(80) NOT NULL CHECK (char_length(btrim(agency)) BETWEEN 1 AND 80),
  label       varchar(80) NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  phone       varchar(32) NOT NULL CHECK (phone ~ '^\+?[0-9][0-9 -]*[0-9]$'),
  is_sample   boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  updated_by  text        REFERENCES public."user"(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

`agency` groups rows ("MDRRMO Bacolor"). `label` names the line ("Globe"). `phone` is stored as typed for
display, and the server returns `tel` built from it. No extra index: the table holds at most 15 rows.
The API enforces "max 15" and "at least one active", because they apply to the whole list, not one row.

### Seed defaults

The same 6 rows go in `seed.sql` and in the migration block, both guarded by
`WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts)`:

| sort | agency | label | phone | is_sample |
|---|---|---|---|---|
| 1 | National Emergency | Emergency hotline | 911 | false |
| 2 | MDRRMO Bacolor | Globe | 0987 654 3210 | true |
| 3 | MDRRMO Bacolor | Smart | 0987 654 3210 | true |
| 4 | MDRRMO Bacolor | Landline | (045) 900-0199 → stored `045 900-0199` | true |
| 5 | BFP Bacolor | Fire station | 0987 654 3210 | true |
| 6 | PNP Bacolor | Police station | 0987 654 3210 | true |

The landline is stored as `045 900-0199` because the phone rule does not allow `()`. `0966…`/`0929…`
are not seeded.

**List version.** A `system_settings` row `emergency_contacts_version` holds an integer (as text, starting
at `1`). Every saved PUT increments it in the same transaction. It is sent to the client as a JSON
integer, so it survives the round trip exactly (a `timestamptz` loses microseconds in JS `Date`).

`db:setup` runs `migration.sql` before `seed.sql`, so on a fresh database the migration inserts the rows
and the seed guard does nothing. The seed copy is there so `seed.sql` still describes the data on its own.

### Migration

- Append one idempotent block to `server/migrations/migration.sql` (ADR 0006): `CREATE TABLE IF NOT EXISTS`,
  a guarded `INSERT` of the defaults, and
  `INSERT INTO system_settings (key, value) VALUES ('emergency_contacts_version', '1') ON CONFLICT (key) DO NOTHING`.
  No numbered `17_*.sql` file.
- Regenerate `schema.sql` with `server/scripts/clean-schema-dump.js` from a scratch DB after the block runs.
- `docs/database.md`: add the table, what each column means, and the seed note.

### API

**`GET /api/public/emergency-contacts`** (no auth)
- Returns `{ success: true, contacts: [{ id, agency, label, phone, tel, is_sample }] }`, only active rows,
  ordered by `sort_order, id`. `tel` is `null` for every sample row, so no client can build a dial link
  for one.
- Uses a 30 s in-memory cache like `/broadcast`, which the PUT clears. Sends `Cache-Control: public, max-age=30`.
- If the query fails it returns `500 { success: false, error: "Server Error" }` and no DB text (same as
  commit 3c62eb2).

**`GET /api/admin/emergency-contacts`** and **`PUT /api/admin/emergency-contacts`**
- `requireRole(["super_admin", "system_admin", "mdrrmo_admin", "head_mdrrmo_admin"])`.
  `barangay_admin` and `resident` get 403.
- GET returns every row, inactive ones too, with `updated_by_name`, `updated_at` and the integer list
  `version`.
- PUT replaces the whole list in one transaction:
  `{ version, contacts: [{ id?, agency, label, phone, is_sample, active }] }`.
  The array order becomes `sort_order`. A row with an `id` is updated. A row without one is inserted.
  Existing rows left out of the array are deleted. Reordering is just a new array order.
- `version` must be a positive integer. The PUT locks the `emergency_contacts_version` row
  (`SELECT … FOR UPDATE`). If the stored value differs, it returns **409** so two admins can't overwrite
  each other; otherwise it writes the list and increments the version. The UI reloads and keeps the
  user's draft.
- The server writes one `activity_log` entry per saved PUT that changed something. It summarises the
  change, e.g. `Updated emergency contacts: added PNP Bacolor/Police station (0918 111 2222); changed phone
  of MDRRMO Bacolor/Globe to 0917 555-0101; deactivated BFP Bacolor/Fire station`. New and changed
  numbers are always named, so the log shows what residents will dial, cut to the 500-char column limit. A no-op PUT
  writes no entry and doesn't bump the version.

**Validation (sharp edges)**: a bad body returns 400 with `{ success: false, errors: [{ index, field, message }] }`
so the UI can show each error next to its field.
- `agency` and `label` are trimmed, then must be 1-80 characters. Control characters (including NUL and
  newlines) are rejected.
- `phone` is trimmed and must match `^\+?[0-9][0-9 -]*[0-9]$`. `tel` = phone with spaces and dashes removed
  (leading `+` kept) and must have 3-15 digits. 3 allows `911`; 15 is the E.164 maximum. Letters, `()`,
  `.`, `#` and `,` are rejected. `,` and `;` would make the phone pause and dial extra digits.
- Types are strict: `is_sample` and `active` must be JSON booleans (`"true"` is rejected), and `id` must
  be a positive integer.
- Unknown fields are rejected. So are a duplicate `id` in one payload and an `id` that doesn't exist.
- The list must have 1-15 rows with at least one `active: true`.
- Rows are not checked for being the same `agency`+`label`+`phone`. Two lines with the same sample number
  are expected right now. The client keys lists on `id`, so it never relies on those being unique.

### Client

- **`useEmergencyContacts()`** (`client/src/hooks/useEmergencyContacts.js`) wraps React Query key
  `["emergencyContacts"]` with `staleTime` 60 s and `refetchOnWindowFocus`.
  - On success it writes the list to Dexie. That is a new `localDb.version(4)` store
    `app_cache: "key"`, holding `{ key: "emergency_contacts", contacts, saved_at }`. Version 4 declares
    only the new store. Dexie carries every earlier store forward unchanged (including `sync_queue` and
    its indexes), and v4 has no `upgrade()` that touches existing data.
  - Offline or on a failed request it returns the Dexie copy and shows no toast. If Dexie has nothing, it
    returns `[{ agency: "National Emergency", label: "Emergency hotline", phone: "911", tel: "911" }]`.
  - Returns `{ contacts, source: "live" | "cache" | "fallback" }`.
- **Consumers.** All of these switch to the hook, and `constants/hotlines.js` is deleted:
  - landing hero: the first 3 active rows in sort order, under the heading "Emergency hotlines"
    (Open question 1)
  - landing footer: grouped by `agency`
  - dashboard contacts card: all active rows
  - `InEffectNow` call buttons: the first 3 dialable rows (sample rows are left out: an urgent
    advisory's call button never shows a placeholder)
  - `PortalFooter`: first 2
  Every list keys on `id`. A non-sample row is an `<a href={`tel:${c.tel}`}>` showing `c.phone`; both
  come from the same server row.
- **Sample rows.** Every role sees a sample row as plain text (no `<a>`, no `tel:`, no copy-to-clipboard)
  with a "Sample, not yet configured" tag. One shared `HotlineEntry` component renders both cases, so a
  consumer can't add a link by mistake. The client also refuses to link a row whose `tel` is missing.
- The rendered DOM gets no new user-supplied HTML. Text goes through React (no `dangerouslySetInnerHTML`),
  and `tel` is server-built from digits and `+` only.

### Admin screen

- One shared page, `client/src/pages/admin/shared/EmergencyContactsManager.jsx`, mounted at
  `/admin/system/emergency-contacts`, `/admin/super/emergency-contacts` and
  `/admin/mdrrmo/emergency-contacts`. It gets an "Emergency Hotlines" link in each of those sidebars
  (`adminNavLinks.js`), next to Settings. I'm not putting it inside the existing pages: System Settings
  is system/super only, and `/admin/mdrrmo/settings` is the personal account page (`AdminSettings`).
- Each row can be edited inline (agency, label, phone), moved up or down (buttons, so it works by
  keyboard; no drag library), switched active or inactive, marked as a sample number, or removed. Remove
  asks first through `ConfirmationModal`. Status uses `StatusBadge`.
- Fields are checked as the user types, with the same rules as the server. Server `errors[]` are mapped
  back to fields.
- Save sends one PUT. The button is disabled while `isPending` or while the form has errors. Success and
  failure use `toast` (Hugeicons, no emoji).
- A preview shows the dashboard card and footer group, built from the draft with the same display
  component residents see.
- Design pass with impeccable (shape, then polish) after this spec is approved.

### Realtime: SSE event plus query invalidation

After a successful PUT the server clears the public cache and calls `sseService.broadcast("EMERGENCY_CONTACTS_UPDATED", {})`.
`useRealtimeEvents` then invalidates `["emergencyContacts"]` and the admin key. That refetch sends a
`Cache-Control: no-cache` request header, so the browser's 30 s copy isn't reused.

Limit: `/api/notif/stream` needs auth, so signed-out landing visitors get no push. They pick up the change
on their next load or when the window regains focus, at most about 60 s later. I'm not opening an
unauthenticated SSE stream for this.

## Commands

```
Server dev:        cd server && npm run dev            (scratch DB via server/.env DB_DATABASE, never LMS_db)
Server tests:      node server/tests/emergency-contacts.regression.cjs
                   node server/tests/emergency-contacts-migration.regression.cjs
All regressions:   for f in server/tests/*.regression.cjs; do node "$f" || echo "FAILED: $f"; done
Server lint:       cd server && npm run lint
Client lint/build: cd client && npm run lint && npm run build
Schema dump:       node server/scripts/clean-schema-dump.js   (from the scratch DB)
```

## Project structure (new and changed)

```
server/migrations/migration.sql, seed.sql, schema.sql        table + defaults
server/services/admin/EmergencyContactsService.js            list, validate, replace, diff summary
server/controllers/admin/emergencyContactsController.js
server/routes/admin/adminSystemRoutes.js                     admin GET/PUT
server/routes/publicRoutes.js                                public GET + cache clear
server/tests/emergency-contacts.regression.cjs               API tests (needs server running)
server/tests/emergency-contacts-migration.regression.cjs     creates/drops its own scratch DB
client/src/lib/localDb.js                                    version(4) app_cache
client/src/hooks/useEmergencyContacts.js, useRealtimeEvents.js
client/src/pages/admin/shared/EmergencyContactsManager.jsx (+ small components)
client/src/App.jsx, constants/adminNavLinks.js
5 consumer files listed above; delete constants/hotlines.js
docs/database.md, docs/testing.md (new scripts in the table)
```

## Testing strategy (TDD: each test fails first, then passes)

`emergency-contacts.regression.cjs` (needs the API running; refuses a non-loopback DB and refuses
`DB_DATABASE=LMS_db`) checks:
1. Public GET shape: fields, active rows only, sort order, `Cache-Control` header. Sample rows have
   `tel: null`. Each non-sample row's `tel` equals `phone` with spaces and dashes removed.
2. Role gate on PUT and admin GET: anonymous 401; resident and barangay_admin 403; mdrrmo_admin,
   head_mdrrmo_admin, system_admin and super_admin 200.
3. Validation, one case each: empty or 81-character agency/label, control characters, letters/`,`/`#`
   in phone, 2 and 16 digits, string boolean, unknown field, duplicate id, unknown id, 0 and 16 rows,
   all inactive. Each returns 400 with the matching `errors[].field`.
4. A PUT that changes something writes exactly 1 `activity_log` row. A no-op PUT writes 0.
5. Admin GET, edit, then PUT with the `version` from that GET returns 200 and the next GET's `version`
   is one higher. Repeating the PUT with the old `version` returns 409 and changes nothing.
6. Public GET reflects a PUT right away (cache cleared).

`emergency-contacts-migration.regression.cjs` creates a scratch DB and loads `schema.sql` from **before**
the change (from git, `origin/main`). It runs `migration.sql` twice and checks that both runs succeed
with 6 rows, no duplicates and version `1`. It then edits a row, runs again, and checks the edit survived. Finally it
drops the DB. Fixtures are deleted by exact ID, as the other scripts do.

## Boundaries

- Always: scratch DB only, diffs before commits, one commit per step, stage explicit paths, no reformatting,
  Hugeicons not emoji.
- Ask first: any real (non-sample) number, unauthenticated SSE, a drag-and-drop dependency, changes to
  the privacy policy HTML.
- Never: run against or `db:setup` LMS_db, push, merge.

## Success criteria

- No phone number or `tel:` literal is left in `client/src` (grep returns nothing), except the single
  911 fallback in the hook.
- An admin edits a number, and the landing hero, footer and dashboard show it (after reload for
  signed-out visitors, through SSE for signed-in ones).
- Sample rows show "Sample, not yet configured" and have no `tel:` link, for every role (anonymous,
  resident, admin). Each non-sample row's `tel:` href equals its visible number with spaces and dashes
  removed.
- With Playwright offline, the last list is still shown and no error toast appears. With an empty cache
  and offline, only 911 is shown.
- A `sync_queue` item queued under Dexie v3 is still there after the v4 upgrade and syncs once online.
- A non-admin PUT gets 403. GET, edit, PUT succeeds; a PUT with a stale version gets 409.
- All `server/tests/*.regression.cjs` pass with the server running. Client lint and build pass.
  Playwright checks run at 1280 and 390 px, light and dark.

## Resolved questions (2026-11-22)

1. Hero: the first 3 active rows by sort order. No `featured` flag.
2. Sample rows: shown to everyone, tagged "Sample, not yet configured", plain text with no `tel:` link for
   any role. Only non-sample rows can be dialled.
3. Activity log: one summary entry per save.
4. `(045) 900-0199` becomes a sample row (MDRRMO Bacolor / Landline). `0966…`/`0929…` are not seeded.
5. `termly-privacy.html` stays out of this branch; TECH_DEBT.md tracks replacing its placeholder contact.
6. List version: an integer counter, not a `timestamptz`.
7. Dexie v4 keeps every existing store; a v3 `sync_queue` item must survive and sync.
