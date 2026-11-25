# Regression tests

Plain Node scripts in `server/tests/*.regression.cjs`. There is no test runner and `npm test` isn't configured. Run each script from the repository root:

```bash
node server/tests/enrollment-requests.regression.cjs
```

Each prints `ok` / `not ok` (or `PASS` / `FAIL`) lines and exits non-zero on failure.

## Safety guards

- Every script that touches a database refuses to run unless the database is on a loopback address (`localhost`, `127.x`, `::1`).
- Fixtures are created with random `zz_…@example.invalid` emails and deleted by exact ID at the end. The scripts print the remaining counts, which should all be 0.
- Outgoing email is stubbed in the test process.

## What each script needs

| Script | Needs the API running | Database it uses |
|---|---|---|
| `archived-version-access`, `barangay-readiness`, `enrollment-requests`, `final-assessment-gating`, `h1-quiz-scoring`, `module-role-separation`, `question-explanations`, `quiz-attempts`, `review-status-guard`, `schema-integrity`, `state-transitions`, `step-assessment-access` | **Yes**, at `TEST_BASE_URL` (default `http://localhost:5000`) | `DB_DATABASE` from `server/.env`, which must be the same database the API uses |
| `health-status`, `register-existing-email`, `user-field-lock` | No | `DB_DATABASE` |
| `new-device-email` | No (in-process, mailer stubbed) | `DB_DATABASE`. Refuses `LMS_db`. Seeds users and sessions, deletes them by id |
| `session-ua-binding` | **Yes**, at `TEST_BASE_URL`; the API must log to this checkout's `server/logs` | `DB_DATABASE`, same as the API. Refuses `LMS_db`. Seeds one user and session per case, deletes them by id |
| `emergency-contacts` | **Yes**, at `TEST_BASE_URL` | `DB_DATABASE`, same as the API. Refuses `LMS_db`: run it against a scratch database. Restores the contact list's content at the end (ids change) |
| `branding` | **Yes**, at `TEST_BASE_URL` | `DB_DATABASE`, same as the API. Refuses `LMS_db`. Restores the branding and organization settings at the end (`branding_version` only goes up) |
| `branding-prod-shape` | **Yes**, at `TEST_BASE_URL` | `DB_DATABASE`, same as the API. Refuses `LMS_db`. Reduces `system_settings` to the five keys production has, runs `migration.sql` on it, saves both cards, then restores every row. Can take about a minute: it waits out the API's 60 s branding cache |
| `branding-cache` | No (in-process) | `DB_DATABASE`. Refuses `LMS_db`. Changes `system_name` briefly and restores it |
| `branding-email` | No (in-process, mailer stubbed) | `DB_DATABASE`. Refuses `LMS_db`. Needs `EMAIL_USER` set (the From check). Restores the settings it changes |
| `restore-safeguards`, `create-first-admin`, `emergency-contacts-migration`, `branding-migration` | No (they start what they need in-process) | Their own scratch database, created and dropped by the script |
| `final-assessment-lock`, `situational-edit` | No | None (pure functions; `final-assessment-lock` imports `client/src/utils/stepLocks.js`) |

Typical run against a local database:

```bash
# terminal 1
cd server && npm run dev

# terminal 2, repo root
for f in server/tests/*.regression.cjs; do node "$f" || echo "FAILED: $f"; done
```

To run the HTTP tests against another local API or database, set both variables for the test process: `DB_DATABASE=other_db TEST_BASE_URL=http://localhost:5055 node server/tests/…`. The API on that port must use the same database.

## Known limitation

The global per-IP rate limiter keeps its state in the `rate_limit` schema of the API's database. Running the whole suite right after other traffic from the same machine (browser checks, a previous run) can trip it, and the HTTP tests then fail with `429 Too many requests`. On a scratch database, empty the `rate_limit` tables (`TRUNCATE ... CASCADE`) and run the failed scripts again.

The enrollment tests create residents who must meet module prerequisites. On a database that already has a published Fundamentals module those residents haven't completed, `enrollment-requests` and `schema-integrity` fail with "Prerequisites not met". Run them on a database without such a module, for example a fresh `npm run db:setup`.
