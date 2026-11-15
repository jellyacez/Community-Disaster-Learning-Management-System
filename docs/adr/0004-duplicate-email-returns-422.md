# ADR 0004: Sign-up with a registered email returns 422 USER_ALREADY_EXISTS

## Status
Accepted

## Date
2026-10-01 (commit `feae96a`)

## Context
With email verification on, Better Auth answers a sign-up for an email that is already registered with the same 200 response as a new account, to avoid revealing which emails exist. The register form then showed "Account created", but no email arrived and nothing happened. Residents couldn't tell they already had an account.

## Decision
A `before` hook on `/sign-up/email` (`server/utils/authHooks.js`) looks the email up, trimmed and lowercased. If it exists, the hook throws 422 with code `USER_ALREADY_EXISTS` and the message "An account with this email already exists. Please sign in or reset your password."

If the lookup itself fails, the hook lets the request through, and Better Auth's own handling still prevents a duplicate account.

## Alternatives considered
The commit records only the trade-off it accepted (revealing registered emails). Other options:
- **Keep Better Auth's anti-enumeration response.** Reveals nothing, but residents see "Account created" and then nothing happens.
- **Send a "you already have an account" email instead.** Reveals nothing on screen, but depends on email delivery.

## Consequences
- **Deliberately**, anyone can learn whether an email is registered. Turnstile on sign-up and the auth rate limiter slow automated probing, but don't prevent it.
- The behaviour is covered by `server/tests/register-existing-email.regression.cjs`.
