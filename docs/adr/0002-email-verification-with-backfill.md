# ADR 0002: Email verification restored, with a one-time backfill

## Status
Accepted

## Date
2026-11-14 (commit `f21dcab`; backfill script `server/scripts/backfill-email-verified.sql`)

## Context
Email verification was switched off twice:

- 2026-06-19 (`9bb5b75`, "for development reasons"), until 2026-09-30 (`c0a533e`);
- again on 2026-10-26, as a side effect of an unrelated commit (`fbb4374`, "Added IP Address for logging user activity").

Accounts created in those windows have `emailVerified = false`. Simply turning `requireEmailVerification` back on would lock them out at sign-in.

## Decision
- **Turn verification back on:** `requireEmailVerification`, send on sign-up, send again on unverified sign-in.
- **Mark the accounts from those windows verified once** with a guarded SQL script:
  - a dry run by default;
  - `apply=true` commits only if the changed-row count equals the `expected` value taken from the dry run.
- **On production**, run it through the manual GitHub workflow "Backfill emailVerified (manual)", which also asks for `confirm: BACKFILL`.

## Alternatives considered
Not recorded in the commits. The obvious ones, with their trade-offs:
- **Make the affected users re-verify by email.** Proves address ownership, but those residents are blocked until the email arrives and they act on it.
- **Leave verification off.** No lock-out, but anyone can register with an address they don't own.

## Consequences
- Accounts from those windows count as verified without proof of address ownership.
- New accounts need working Gmail settings to complete sign-up.
- Runbook: [auth.md](../auth.md#backfill-for-accounts-created-while-verification-was-off).
