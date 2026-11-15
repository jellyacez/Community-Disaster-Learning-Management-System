# ADR 0001: Two-factor authentication behind one server flag, off by default

## Status
Accepted

## Date
2026-11-01 (commits `d27500f`, `12a63bd`)

## Context
Admin 2FA was enforced (`authenticate.js` returned 403 `MFA_REQUIRED` for admins without 2FA), but Better Auth's twoFactor plugin wasn't registered. Admins were sent to a setup page whose endpoints returned 404, and every API call failed. Separate `DISABLE_MFA` and `VITE_DISABLE_MFA` flags on server and client could disagree.

## Decision
One server flag, `MFA_ENABLED`, off unless set to `true`:

- It registers the twoFactor plugin only when on (`server/utils/auth.js`).
- It enforces 2FA for every admin role only when on (`server/config/permissions.js`, `server/middleware/authenticate.js`).
- The client reads the flag from `GET /api/public/auth-policy`, and uses it only to show the setup redirect and the Settings section.

The server check stays the source of truth. `DISABLE_MFA` and `VITE_DISABLE_MFA` were removed.

## Alternatives considered
Not recorded in the commits. The obvious ones, with their trade-offs:
- **Keep 2FA mandatory and register the plugin.** Stronger admin accounts, but every admin has to complete setup (email or authenticator app) before using the system.
- **Separate server and client flags.** The setup that existed before. The two flags could disagree, which is how the 404/403 loop happened.

## Consequences
- Admin accounts are protected by password only, until someone sets `MFA_ENABLED=true` and restarts.
- Turning it on needs no migration (the `twoFactor` table exists). Each admin then has to finish setup at `/admin/mfa-setup` before they can use the API.
- How to re-enable: [auth.md](../auth.md#two-factor-authentication-off-by-default).
