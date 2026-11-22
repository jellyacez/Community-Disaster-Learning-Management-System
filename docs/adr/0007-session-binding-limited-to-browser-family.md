# ADR 0007: Sessions are bound to the browser family, not the full User-Agent

## Status
Accepted

## Date
2026-11-22

## Context
`authenticate()` revoked a session whenever the request's `User-Agent` differed from the one stored at sign-in. A User-Agent changes legitimately: Chrome auto-updates (156 to 157), DevTools device mode and Android's "Request desktop site" change the OS part. Production logged 22 `session_hijack_attempt_detected` events from exactly these cases, each one signing a real user out with no explanation (audit finding P0-28, KNOWN item 9).

The User-Agent is also a weak secret: anyone who steals a session cookie can copy the header. The check only ever stops a replay from a different kind of client, such as a script or another browser.

## Decision
- The stored value stays the raw header. At compare time both sides go through `normalizeUserAgent()` (`server/utils/userAgent.js`), which yields browser family, engine, OS and major version.
- Only a **family change** (Chrome to Firefox, Chrome to Edge, a browser to a script) revokes the session and returns **401 `SESSION_BROWSER_CHANGED`**. The existing event name `session_hijack_attempt_detected` is kept for it.
- An OS or version change is let through and logged once per session as `session_client_change_noted` with `reason` (`os_changed`, `version_changed`) and the old and new normalized values.
- A missing or empty request `User-Agent` is not a mismatch: it is let through and logged with reason `ua_missing`. Some clients and proxies strip the header, and an attacker can always send one, so revoking on absence adds nothing. A session stored without a User-Agent is never bound.
- Sessions created before this change need no migration: their raw value is normalized when compared.
- The client matches on the code (not the message) and shows "You were signed out because your browser changed. Please sign in again." on the sign-in page.

## Alternatives considered
- **Remove the check.** Simplest, but drops the one cheap defence against replay from a different kind of client.
- **Compare the full string except the version numbers.** Still revokes on device-mode and desktop-site switches, which are the other half of the evidence.
- **Add IP or other fingerprint binding.** Mobile and Wi-Fi/cellular switches change the IP constantly; worse than the UA.

## Consequences
- A stolen cookie replayed from the same browser family still works until it expires or is revoked. This was already true for anyone who copies the header; the change only removes the false positives.
- Switching browsers on the same machine with the same cookie is impossible anyway (cookies are per profile), so the family check rarely fires for honest users.
- `session_client_change_noted` is the place to watch for real anomalies.
- Covered by `server/tests/session-ua-binding.regression.cjs`.
