# Authentication

Better Auth (`server/utils/auth.js`) with HTTP-only session cookies. Sessions last 7 days and roll forward when used within the last 24 hours. The cookie cache is off, so deleting session rows (Force Logout All Users, or a restore) signs people out immediately.

## Sign-up and sign-in

- **Turnstile:** email sign-up and email sign-in (`POST /api/auth/sign-up/email`, `/api/auth/sign-in/email`) require a Cloudflare Turnstile token (`server/middleware/verifyTurnstile.js`). There is no development bypass. Locally, use Cloudflare's test keys ([configuration.md](configuration.md)).
- **Duplicate email:** signing up with an email that already has an account returns **422 `USER_ALREADY_EXISTS`** with "An account with this email already exists. Please sign in or reset your password." (`server/utils/authHooks.js`). This tells anyone whether an email is registered; that is a deliberate choice ([ADR 0004](adr/0004-duplicate-email-returns-422.md)).
- **Google sign-in:** available only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- **Password changes:** a manual password change is refused within 24 hours of the previous one. Forgot Password still works.

## Session binding

Each session stores the raw `User-Agent` from sign-in (`session.userAgent`). `authenticate()` (`server/middleware/authenticate.js`) compares it on every authenticated request after normalizing both sides to browser family, engine, OS and major version (`server/utils/userAgent.js`):

| Change since sign-in | Result |
|---|---|
| none, or a minor/build difference | 200, nothing logged |
| browser version (auto-update) | 200, `session_client_change_noted` with `reason: "version_changed"` |
| OS (device mode, "Request desktop site") | 200, `session_client_change_noted` with `reason: "os_changed"` |
| request has no or an empty `User-Agent` | 200, `session_client_change_noted` with `reason: "ua_missing"` |
| browser family (Chrome to Firefox, browser to script) | **401 `SESSION_BROWSER_CHANGED`**, that one session is revoked, `session_hijack_attempt_detected` logged with `reason: "browser_family_changed"` |

Log lines carry `expected` and `received` normalized objects; the revoke event also keeps the raw strings. `session_client_change_noted` is logged once per session and distinct change. Sessions created before this change are normalized when compared, so no migration was needed. Only the User-Agent is compared; the IP address is stored but never compared. Rationale: [ADR 0007](adr/0007-session-binding-limited-to-browser-family.md).

On `SESSION_BROWSER_CHANGED` the client (`apiClient.js`) stores a one-shot notice and the sign-in page shows "You were signed out because your browser changed. Please sign in again." Queued offline writes are not discarded: they stay in the sync queue (after the retry budget they show as failed and can be retried once signed in).

## Email verification

`requireEmailVerification` is on: an account can't sign in until its email is verified.

- The verification link is sent at sign-up and again whenever an unverified account tries to sign in.
- Verifying signs the user in.
- Admin accounts created through provisioning, and accounts made with `create-first-admin`, are marked verified.
- Without working `EMAIL_USER` / `EMAIL_APP_PASSWORD`, new residents can't complete sign-up.

### Backfill for accounts created while verification was off

Verification was off between 2026-06-19 and 2026-09-30, and again from 2026-10-26 until it was turned back on. Accounts created then have `emailVerified = false` and are blocked at sign-in. [`server/scripts/backfill-email-verified.sql`](../server/scripts/backfill-email-verified.sql) marks them verified. Take a backup first. The script is a dry run unless `apply=true`, and it commits only if the number of changed rows equals `expected`:

```bash
# dry run: prints how many accounts would change
psql "$DATABASE_URL" -v cutoff='2026-11-14 18:00:00+08' -f server/scripts/backfill-email-verified.sql

# apply, with the count the dry run printed
psql "$DATABASE_URL" -v cutoff='2026-11-14 18:00:00+08' -v apply=true -v expected=41 -f server/scripts/backfill-email-verified.sql
```

- `cutoff` is required: accounts created before it are included.
- `since` is optional: a lower bound.

On production, the manual GitHub workflow **Backfill emailVerified (manual)** runs the same script over SSH (UNVERIFIED: described from the workflow file; the script itself was run on a scratch database). Its inputs are `cutoff`, `mode` (`dry-run` or `apply`), `expected_count`, `confirm` (type `BACKFILL`), and an optional SMTP check that sends one email to the `SMTP_TEST_TO` secret. See [ADR 0002](adr/0002-email-verification-with-backfill.md).

## Two-factor authentication (off by default)

2FA is controlled by one server flag, `MFA_ENABLED` ([ADR 0001](adr/0001-2fa-behind-mfa-enabled.md)).

- **Off** (default, anything but `true`): Better Auth's twoFactor plugin isn't registered, so its endpoints and the sign-in 2FA challenge don't exist. No role is asked for 2FA, and the Settings page hides the 2FA section.
- **On** (`MFA_ENABLED=true`, then restart the API):
  - The plugin is registered.
  - Every admin role (super_admin, system_admin, head_mdrrmo_admin, mdrrmo_admin, barangay_admin) must have 2FA. The API answers **403 `MFA_REQUIRED`** for an admin without it (`server/middleware/authenticate.js`).
  - The web app reads `GET /api/public/auth-policy` and sends such admins to `/admin/mfa-setup`.
  - Residents see an optional 2FA section in Settings (`client/src/pages/user/settings/Settings.jsx:47`).

The `twoFactor` table exists either way, so turning the flag on needs no database change. Admins must have working email or an authenticator app before you turn it on, or they can't finish setup.
