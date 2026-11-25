# Spec: System Branding (System Name, Platform Logo)

Status: APPROVED 2026-11-25 (answers folded in below). Branch `feat/branding` (from origin/main 3ad3c74).
Fixes audit findings P3-02, P3-03, P5-11 (`scratch/audit-2026-11-21/`). Also closes the
support-email part of input-validation M10 and the "From" half of P3-04 (see "TECH_DEBT items").

## Objective

The System Branding card (System settings, `manage_system_settings`) saves a system name and a
logo that nobody sees today (P3-02). After this branch:

- The saved name and logo replace the product name and the shield mark everywhere the product
  names itself: admin and resident sidebars and headers, landing nav and footer, the auth pages,
  browser tab titles, and emails. This works signed in, signed out and offline.
- Every email path uses the org footer and the support email (P3-03 / P5-11). The support email
  becomes **Reply-To only**. "From" is always the authenticated `EMAIL_USER` address.
- Wording that is official, legal or build-time stays fixed: certificates, the PDF, terms and
  privacy text, the PWA install name and icon, role labels, and place names ("Municipality of
  Bacolor", "Bacolor MDRRMO").

## Current state (origin/main)

- `system_name` and `system_logo` are rows in `public.system_settings` (`key`, `value text`).
  `seed.sql:34` seeds `system_name = 'Community Disaster Learning Management System'`, which no
  screen shows. Every screen hardcodes "Bacolor Disaster LMS", and every email says "DRRM Bacolor".
- `PATCH /api/admin/settings/branding` takes either an `https://` URL or a base64 data URL
  (`png|jpeg|webp|svg+xml`, decoded size ≤ 500 KB). It checks the data-URL prefix only, not the
  bytes, so an SVG or HTML payload labelled `image/png` passes. The name has no length limit.
- `GET /api/admin/settings/logo` is admin-only. There is no public read.
- The "logo" on every screen is the `Shield01Icon` in a red rounded square.
- `utils/settings.js#getOrgSettings()` returns `{ orgFooterText, supportEmail }`. Three send paths
  never call it: the new-login email (`securityService.js:109`), password recovered (`:56`,
  unreachable per P5-10), and the recertification reminder (`certificateExpiryCron.js:66`).
- Every template sends `from: "DRRM Bacolor …" <${supportEmail || EMAIL_USER}>`. The Gmail
  transport authenticates as `EMAIL_USER`, so a support email on another domain breaks SPF/DMARC
  or gets rewritten (P3-04). `support_email` is stored without validation
  (`"x\r\nBcc: y"` is accepted, M10).
- The service worker has `runtimeCaching: []`, so it never caches `/api`. Nothing stale comes
  from the service worker.

## Inventory: every hardcoded name and what happens to it

"Setting" means the text comes from `system_name` (falling back to the default, see below).
"Fixed" means the text is unchanged.

### Client: product name in the UI

| File:line | Today | Decision |
|---|---|---|
| `components/ui/landing/LandingNavbar.jsx:56,62` | aria-label and name "Bacolor Disaster LMS", shield tile | **Setting** (name + logo). "Pampanga, Philippines" fixed |
| `components/ui/landing/LandingFooter.jsx:39` | name + shield tile | **Setting** (name + logo). "Municipality of Bacolor, Pampanga", tagline, "Modules published by the Bacolor MDRRMO" fixed |
| `components/layouts/AuthLayout.jsx:35,43` (sign-in, register, forgot, reset, verify prompt, MFA setup) | aria-label, name, shield tile | **Setting** (name + logo) |
| `pages/auth/SignInPage.jsx:206` | subtitle "Access your Bacolor Disaster LMS account…" | **Setting** |
| `pages/auth/RegisterPage.jsx:46` | subtitle "Register to access Bacolor Disaster LMS" | **Setting** |
| `components/layouts/UserSidebar.jsx:179` | eyebrow "Bacolor Disaster LMS" + shield tile | **Setting** (name + logo) |
| `components/layouts/UserSidebar.jsx:182` | "User Portal" | **Fixed** (role label) |
| `components/layouts/UserNavbar.jsx:29` | fallback page title "Resident Portal" | **Fixed** (role label) |
| `components/layouts/AdminSidebar.jsx:102` | red header bar "Admin Portal" | Logo + **setting** name added as a small line above "Admin Portal". "Admin Portal" stays **fixed** (role label) |
| `components/layouts/AdminLayout.jsx:59` | mobile header "Admin Portal" | **Fixed** (role label; the logo is added beside it) |
| Breadcrumbs "Admin Portal" (`EmergencyContactsManager:70`, `SystemHealth:51`, `ActivityLog:89`, `SystemSecurity:13`, `SystemSettings:72`, `UserManagement:83`) | | **Fixed** (role label) |
| `components/ui/PortalFooter.jsx:14` | "Bacolor Disaster LMS" | **Setting** |
| `components/ui/modals/OnboardingModal.jsx:194` | "Welcome to Bacolor Disaster LMS!" | **Setting** |
| `pages/public/MaintenancePage.jsx:89` | "Bacolor Disaster LMS is currently undergoing…" | **Setting** (`/api/public` is exempt from maintenance, `maintenanceMiddleware.js:38`) |
| `pages/admin/system/settings/components/BrandingPanel.jsx:81` | input default "Community Disaster Learning Management System" | Shows the effective name (setting, else default) |
| `pages/admin/super/overview/components/SuperMissionBanner.jsx:23` | "Bacolor DRRM command control telemetry…" | **Fixed** (descriptive copy, not the product name) |
| `components/pwa/InstallAppPrompt.jsx:80,93` | "Install Bacolor Disaster LMS" | **Fixed**: it names what gets installed, and the manifest name is build-time (see PWA) |
| `components/ui/modals/TermsModal.jsx:33,38`, `pages/public/PrivacyPolicyPage.jsx:32`, `public/termly-privacy.html` | "Community Disaster Learning Management System" | **Fixed** (legal text) |
| `components/ui/certificates/CertificateCard.jsx:88`, `pages/user/certificates/certTemplate.jsx:184` | certificate wording | **Fixed** (official MDRRMO wording, see Certificates) |
| `pages/public/VerifyCertificate.jsx:68,293,296,318,325` | "Bacolor MDRRMO", "Official DRRM Public Registry" | **Fixed** (issuing authority, not the product). Its tab title follows the title rule below |
| Landing hero, hazards, steps, features ("Bacolor", "MDRRMO") | | **Fixed** (place and agency names) |

### Client: browser tab titles

All ~40 `useDocumentTitle(...)` calls hardcode a suffix: "| Bacolor Disaster LMS" (resident, auth,
public), "| DRRM Bacolor" (`AdminSidebar.jsx:55`), "| DRRM Portal", "| Admin Console",
"| MDRRMO Admin", "| System Admin", "| Barangay Admin", "| Bacolor Disaster LMS Admin".

**Decision:** `useDocumentTitle(pageTitle)` takes only the page part and appends
`" | " + systemName`. Every call site drops its suffix, so the admin pages read
`System Health | <name>`, for example. The role words ("Admin Console") leave the title. The
sidebar already shows the role. `ModuleViewer` passes the module title, or "Module Viewer" while it
loads. Before branding is known (first visit, no saved copy), the title is the page part alone,
never the wrong name.

### Build-time (static) and fixed

| File | Text | Decision |
|---|---|---|
| `client/index.html:53` `<title>` | "Bacolor Disaster LMS" | **Fixed**: shown before JS runs, then replaced by the hook |
| `client/index.html:14` `apple-mobile-web-app-title`, `:50` meta description | | **Fixed** (build-time) |
| `client/vite.config.js:14-17` manifest `name`, `short_name`, `description`, icons | | **Fixed** (build-time, see PWA) |
| `server/utils/auth.js:167` Better Auth `appName: "Bacolor Disaster LMS Portal"` | | **Fixed**: it is the TOTP issuer label in authenticator apps. Changing it per setting would relabel enrolled entries inconsistently |
| `server/utils/mdrrmoReportWorkbook.js:162` `wb.creator` | | **Fixed** (report file metadata of an official report) |

### Server: emails

| Template | Today | Decision |
|---|---|---|
| `templates/emailWrapper.js:16` header | `DRRM <span red>Bacolor</span>` | **Setting**: `escapeHtml(systemName)` in one colour (a user-defined name can't be split). No logo image in emails (see Open questions) |
| `emailWrapper.js:26` footer | `© year ${orgFooterText}` | Unchanged (already the setting, escaped) |
| `emailWrapper.js:28-30` "automated security message. Please do not reply directly" | | "This is an automated message." With a Reply-To set, "do not reply" contradicts it, so that sentence is dropped |
| every template `from:` | `"DRRM Bacolor[ Security\| Certifications]" <supportEmail\|\|EMAIL_USER>` | `from: { name: systemName [+ " Security" / " Certifications"], address: EMAIL_USER }`; `replyTo: supportEmail` when set and different from `EMAIL_USER`. A nodemailer address object encodes the display name, so a quote or CRLF in the name can't inject a header |
| `resetPassword.js:7` subject "Reset Your Password - DRRM Bacolor" | | **Setting**: `- ${systemName}` (subjects are plain text, not HTML-escaped; CR/LF can't occur, see validation) |
| `verification.js:7` subject "Verify Your Email Address - DRRM Bacolor" | | **Setting** |
| `verification.js:11` "Welcome to DRRM Bacolor, …" | | **Setting**, escaped |
| `resetPassword.js:12`, `adminPasswordReset.js:12`, `securityAlerts.js:14`, `accountNotices.js:29,41,49,57,66,67,76,88,96` "your DRRM Bacolor account" | | **Setting**, escaped |
| `securityAlerts.js` "contact a DRRM Administrator", `otp.js` "including DRRM administrators" | | **Fixed** (role words) |
| Other subjects ("Security Alert: …", "Your account has been suspended", recert "Action Required: …") | | **Fixed** (no product name in them) |

## Decisions

### Default name and the seed mismatch

- A single default lives in `client/src/constants/branding.js` and `server/config/constants.js`:
  `DEFAULT_SYSTEM_NAME = "Bacolor Disaster LMS"`. The default logo is the current shield tile.
- **The seeded value differs from what users see.** If the setting is wired as-is, every existing
  database switches its visible name to "Community Disaster Learning Management System" on deploy.
  **Recommendation:** `seed.sql` seeds "Bacolor Disaster LMS". A guarded `migration.sql` statement
  rewrites `system_name` to "Bacolor Disaster LMS" **only while it equals the old seed text
  exactly**. A name an admin actually saved is never touched. Open question 1.

### Storage

- Keep the existing `system_settings` rows (`system_name`, `system_logo`). No schema change.
  The logo stays a `data:image/...;base64,` string in the database, so backups and restores
  (`docs/backup-restore.md`) carry it. Nothing new goes on disk under `/uploads`.
- New row `branding_version` (integer as text, starting at `1`). It goes up by one, in the same
  transaction, every time the name or logo changes. The client uses it to skip re-downloading an
  unchanged logo, and as the cache-busting `?v=`. It is inserted by `migration.sql` and `seed.sql`
  with `ON CONFLICT DO NOTHING`.

### Validation (server, `PATCH /api/admin/settings/branding`, permission unchanged)

Body: `{ system_name?, system_logo?, remove_logo? }`. At least one field must be present.

- **Name:** trimmed. 2–60 characters (60 fits the 288 px sidebar on two lines). No control
  characters (`\p{Cc}`, so no CR/LF/TAB). The sanitizer middleware already strips tags and
  decodes entities, so "Fire & Rescue LMS" is stored as typed. Out of range → `400` with the
  exact rule ("System name must be 2 to 60 characters").
- **Logo, accepted types:** PNG, JPEG, WEBP only. Input must match
  `^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$`.
- **SVG is rejected, not sanitized** (`400 "SVG logos aren't accepted. Use PNG, JPG or WEBP."`).
  SVG can carry scripts. An `<img>` won't run them, but opening the logo URL directly would.
  Sanitizing SVG safely needs a new dependency and keeps a risk. A raster logo covers the need.
- **The bytes must match the declared type** (magic bytes): PNG `89 50 4E 47 0D 0A 1A 0A`,
  JPEG `FF D8 FF`, WEBP `RIFF....WEBP`. A mismatch gets `400 "The file isn't a valid PNG, JPG or WEBP image."`.
  This stops an SVG or HTML file labelled `image/png`.
- **Size:** decoded size ≤ 500 × 1024 bytes, measured on the decoded `Buffer` (not estimated from
  the base64 length). This matches the UI text "up to 500 KB" and the client pre-check. The data
  URL of a 500 KB image is about 683 KB, within the 800 kb `express.json` limit. A larger body
  gets the existing 413.
- **URLs are no longer accepted** (`https://…` → 400). An external URL means a third-party
  request on every page view, and the logo can change without a save. The UI never sent one.
- **`remove_logo: true`** deletes the `system_logo` row, which brings back the default shield. The
  panel gets a "Remove logo" button.
- **What happens to the value stored today:** the public read runs the same validation on the
  stored value. An SVG, a URL, mismatched bytes or an oversize value counts as **no logo** (the
  shield is shown) and is never served. The row is not deleted by migration (non-destructive).
  The admin panel says "The saved logo isn't a supported format (SVG or a link). Upload a PNG,
  JPG or WEBP, or remove it." The next save or remove replaces it.
- No re-encoding. Re-encoding would need a new dependency (`sharp`) and would strip EXIF
  metadata. JPEG EXIF (camera, possibly GPS) is served as uploaded. Open question 3.
- Activity log: "Updated system branding (name)", "(logo)", "(name, logo)" or "(removed logo)".

### Public read

- `GET /api/public/branding` (no auth, exempt from maintenance) returns:
  `{ success, name, version, logo: { url: "/api/public/branding/logo?v=<version>" } | null }`.
  It sets `Cache-Control: public, max-age=60` and removes the `/api` no-store headers, as
  `getPublicContacts` does. The server keeps a 60 s in-process cache, cleared on save
  (the same pattern as `clearBroadcastCache`).
- `GET /api/public/branding/logo` returns the decoded bytes with the validated `Content-Type`,
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, and
  `Content-Disposition: inline; filename="logo.<ext>"`. When `?v=` equals the current version:
  `Cache-Control: public, max-age=31536000, immutable`. Otherwise `max-age=60`. It returns `404`
  when no valid logo is stored.
- The admin-only `GET /api/admin/settings/logo` stays (the panel preview), and adds
  `logo_supported: boolean` for the notice above.

### Client: `useBranding()`, `<BrandMark>`, offline

- `client/src/hooks/useBranding.js` follows `useEmergencyContacts`. It has its own query key
  `["branding"]`, `staleTime: 60_000`, `refetchOnWindowFocus`, `networkMode: "always"`, and
  never throws (no global error toast).
  - Fetch the JSON. If `version` differs from the saved copy, fetch the logo as a blob and turn it
    into a data URL. Save `{ name, version, logoDataUrl }` in `localDb.app_cache` under key
    `branding`.
  - API fails → saved copy. No saved copy → `{ name: DEFAULT_SYSTEM_NAME, logo: null }` (shield).
  - The saved copy is the query's `placeholderData`, so the second visit renders the right name
    with no flash. On the very first visit, name slots render empty (fixed width) until the first
    answer, instead of flashing the default and then the custom name.
- `client/src/components/ui/BrandMark.jsx`: the uploaded logo, or the current red shield tile.
  The size comes from the caller (40 px landing/auth/footer, 36 px sidebars). The image uses
  `object-contain` on a white rounded tile, so a transparent dark logo stays visible in dark mode.
- **Alt text:** in every listed place the mark sits next to the visible name, so the image is
  decorative (`alt=""`) and the link keeps its `aria-label="<name> — home"`. No separate alt-text
  setting is needed. The admin preview uses `alt="Current logo"`.
- **Rendering:** the name is always rendered as a React text node or an attribute value, never
  with `dangerouslySetInnerHTML`. `document.title` is a plain string assignment.

### Refresh after an admin saves

- The saving tab invalidates `["branding"]`, `["systemSettings"]` and `["systemLogo"]`.
- The server broadcasts SSE `BRANDING_UPDATED { version }` (`sseService.broadcast`), and
  `useRealtimeEvents` invalidates `["branding"]` with the version noted (the same `?v=` trick as
  hotlines, so the refetch skips the browser's 60 s copy). SSE reaches signed-in users only.
- Signed-out pages (landing, sign-in) pick up the change on the next window focus or page load
  after the 60 s browser cache ends. That is acceptable for a rarely changed setting.

### PWA

The installed app's name, short name and icons come from the build (`vite.config.js` manifest,
`index.html`, `public/*.png`) and do not follow this setting. The Branding card's helper text says
so: "Changes the name and logo shown in the app and in emails. The installed app's name and home-screen icon are set when the app is built and don't change here."

### Certificates

Certificate and PDF wording stays fixed (official MDRRMO wording): `CertificateCard.jsx`,
`certTemplate.jsx`, the verification page authority text. The logo is not put on certificates.
I recommend keeping it this way unless you say otherwise.

### Emails (P3-03 / P5-11)

- `getOrgSettings()` returns `{ systemName, orgFooterText, supportEmail }` in one query.
  `supportEmail` is `null` unless the stored value passes the email check. It no longer falls back
  to `EMAIL_USER`, because `from` always uses `EMAIL_USER` anyway.
- All templates take one `org` object as their last argument, replacing the
  `(orgFooterText, supportEmail)` pair. Every caller passes `await getOrgSettings()`. That adds
  `securityService.js:56` (recovered), `:109` (new login) and the recert cron, which reads the
  settings once per run, not per email.
- `accountNotices.contactLine` keeps its `mailto:` and falls back to `EMAIL_USER` when no support
  email is set (current behaviour).
- `support_email` gets server-side validation on save (`PATCH /settings/organization`): empty
  (clears it), or ≤ 254 characters matching `^[^\s@]+@[^\s@]+\.[^\s@]+$` with no CR/LF. Otherwise
  `400`. `org_footer_text` is limited to 200 characters with no control characters.

### Escaping

- Emails: `systemName` goes through `escapeHtml` (`templates/escape.js`) wherever it enters HTML:
  the header, greetings, "your … account". Subjects and the From display name are plain text
  (nodemailer encodes them). The name can't contain CR/LF (validation), and stored values are
  re-checked by `getOrgSettings` (a value failing the rule falls back to the default).
- UI: text nodes only, see above.

## TECH_DEBT items

| TECH_DEBT note | Closed here? |
|---|---|
| Recert reminder ignores org footer and support email ("Left open" of P5-16, line 36) | **Yes** |
| M10: unvalidated support email (line 812) | **Partly**: support email validated. Maintenance `"false"` and broadcast severity stay open |
| P3-04: support email used as From, never shown to users | **Partly**: From fixed, Reply-To added. Showing it on Help & Support stays open |
| P5-10: "Account Recovered" email unreachable | **No**. The template gets the org settings, but the path stays unreachable |
| Manifest content type (nginx, line 835) | **No** (unrelated) |

TECH_DEBT gets a "Resolved: System branding saved but never shown (P3-02, P3-03, P5-11)" entry.
The P5-16 "Left open" line is updated. Anything this branch leaves open goes under "Left open".

## Commands

```
API (scratch):   cd server && set PORT=5080, DB_DATABASE=lms_c_branding, FRONTEND_URL=http://localhost:5173 -> npm run dev
DB setup:        cd server && DB_DATABASE=lms_c_branding npm run db:setup   (never LMS_db)
Client:          cd client && npm run dev   (port 5173, /api proxied to 5080)
Server tests:    for f in server/tests/*.regression.cjs; do DB_DATABASE=lms_c_branding TEST_BASE_URL=http://localhost:5080 node "$f" || echo "FAILED: $f"; done
Lint:            npm --prefix server run lint ; npm --prefix client run lint   (client has a 43-error baseline on main: no new errors)
Build:           npm --prefix client run build
Browser checks:  playwright-cli at 1280 and 390 px, light and dark
Cleanup:         DROP DATABASE every lms_c_* created here
```

## Project structure (new and changed)

```
server/routes/publicRoutes.js                     + GET /branding, /branding/logo
server/services/admin/SystemSettingsService.js    branding read/validate/update, branding_version
server/controllers/admin/systemSettingsController.js  validation, remove_logo, SSE, cache clear
server/utils/branding.js (new)                    name/logo/support-email/footer rules (shared by save, read and email)
server/utils/templates/sender.js (new)            From/Reply-To envelope and org defaults
server/utils/settings.js                          getOrgSettings -> { systemName, orgFooterText, supportEmail }
server/utils/templates/*.js                       org object, From/Reply-To, name in header/subjects/body
server/services/securityService.js, utils/certificateExpiryCron.js   pass org settings
server/config/constants.js                        DEFAULT_SYSTEM_NAME
server/migrations/migration.sql, seed.sql         branding_version row; guarded seed-name fix
client/src/constants/branding.js (new)            DEFAULT_SYSTEM_NAME
client/src/hooks/useBranding.js (new), hooks/useDocumentTitle.js, hooks/useRealtimeEvents.js
client/src/components/ui/BrandMark.jsx (new)
client/src/components/layouts/*, components/ui/landing/*, PortalFooter, OnboardingModal, auth pages, MaintenancePage
client/src/pages/**  useDocumentTitle call sites (suffix removed)
client/src/pages/admin/system/settings/components/BrandingPanel.jsx   types text, helper text, remove, notice
server/tests/branding.regression.cjs, branding-email.regression.cjs, branding-migration.regression.cjs (new)
docs/specs/branding.md, docs/testing.md (table rows), docs/configuration.md (branding + support email), TECH_DEBT.md
```

## Code style

Follow the existing patterns. Pass a value object instead of growing the positional arguments:

```js
const getVerificationEmail = (user, token, org) => ({
  from: { name: org.systemName, address: process.env.EMAIL_USER },
  ...(org.supportEmail && { replyTo: org.supportEmail }),
  to: user.email,
  subject: `Verify Your Email Address - ${org.systemName}`,
  html: emailWrapper("Verify Your Email Address", `...Welcome to ${escapeHtml(org.systemName)}...`, org),
});
```

Hugeicons only (no emoji). Comments are one line and explain why.

## Testing strategy (TDD: each test fails first, then passes)

1. **`server/tests/branding.regression.cjs`** (API running, scratch DB, refuses `LMS_db`, restores
   the original branding rows at the end):
   - Signed out, `GET /api/public/branding` → 200, the default/seeded name, `logo: null`, `Cache-Control` max-age=60.
   - Name: 1 char, 61 chars, `"a\r\nb"` → 400. `"<b>X</b> LMS"` stored as `X LMS`. `"Fire & Rescue"` round-trips.
   - Logo: tiny valid PNG/JPEG/WEBP → 200 and the version increments. The logo endpoint returns the exact bytes, the right `Content-Type`, `nosniff`, and `immutable` with the current `?v`.
   - SVG data URL → 400. SVG bytes labelled `image/png` → 400. `https://` URL → 400. Malformed base64 → 400. Exactly 500 KB → 200. 500 KB + 1 → 400.
   - `remove_logo` → public `logo: null`, the logo endpoint 404s.
   - A legacy SVG / URL value written straight into the DB → public `logo: null`, the logo endpoint 404s, and the admin logo returns `logo_supported:false`.
   - Resident and unauthenticated PATCH → 401/403.
   - `support_email` validation (`"x\r\nBcc: y"`, `"not-an-email"` → 400; empty clears).
2. **`server/tests/branding-email.regression.cjs`** (in-process, mailer stubbed), with the name
   `Q<b>&"Name` and a footer/support marker, drives every send path (verification, reset,
   OTP, admin reset, provisioning, account notices, password changed, new login, recovered,
   recert cron):
   - The escaped name appears in the header. The raw `<b>` never appears.
   - The subjects for reset/verify carry the name.
   - `from.address === EMAIL_USER` and `replyTo === support`.
   - The footer marker appears on all of them, including new login, recovered and recert (red today).
3. **Existing:** `email-escaping.regression.cjs` and the other mail tests are updated only where
   template signatures changed. All `server/tests/*.regression.cjs` pass with the server running.
4. **Browser (playwright-cli)** at 1280 and 390 px, light and dark: save a new name and a PNG logo
   as system admin. Then, signed in (admin and resident) and signed out, check that the name and
   logo show in every "Setting" place in the inventory and in the tab titles. Then check offline
   (the saved copy), a reload after "Remove logo" (the shield is back), and the PWA helper text.
   Screenshots go to `scratch/branding-shots/`.
5. **Final:** differential review of the branch diff → `scratch/differential-review-branding.md`.

## Boundaries

- Always: scratch DB `lms_c_*`, API on 5080–5089, client on 5173. Tests before implementation.
  Escape the name in HTML. Run the full regression suite before calling it done.
- Ask first: adding a dependency (e.g. `sharp`, an SVG sanitizer), changing certificate/PDF
  wording, changing the PWA manifest, any schema change beyond `system_settings` rows.
- Never: touch `LMS_db`, push, accept SVG, use `support_email` as the From address, render the
  name as HTML.

## Success criteria

- After a save, the new name and logo appear in every "Setting" row of the inventory, signed in
  and signed out, within one page load (signed-out: after the 60 s cache). Tab titles end in
  ` | <name>`.
- Fixed rows (certificates, legal text, role labels, PWA name, place names) are unchanged.
- Offline with a saved copy: the last saved name and logo show. With no saved copy and no network:
  "Bacolor Disaster LMS" and the shield.
- Every email: the header and the name-bearing subjects/body use the escaped name, `From` is
  `EMAIL_USER`, `Reply-To` is the support email when set, and the org footer is present on all
  10 send paths.
- SVG, mismatched bytes, URLs and > 500 KB are rejected server-side with the same wording as the UI.
- Both new tests pass (and failed before the change). All existing regression tests pass. No new
  lint errors. The client build succeeds. The scratch DBs are dropped.

## Resolved questions (2026-11-25)

1. **Seed name:** yes. `seed.sql` seeds "Bacolor Disaster LMS", and `migration.sql` rewrites
   `system_name` only while it still equals "Community Disaster Learning Management System".
2. **Admin sidebar:** the logo and name go above "Admin Portal". The role label stays.
3. **EXIF:** PNG/JPG/WEBP are stored as uploaded, with no `sharp`. TECH_DEBT records that EXIF
   metadata is kept. The card's helper text says "Upload an exported logo image, not a phone photo."
4. **Logo in emails:** no.
5. **Tab titles:** `<page> | <name>` everywhere.
