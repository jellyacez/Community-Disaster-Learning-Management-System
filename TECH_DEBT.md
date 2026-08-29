# Technical Debt & Architecture Log

This document tracks identified technical debt, architectural decisions, missing features, optimization opportunities, and resolution history for the Bacolor Community Disaster Learning Management System.

---

## 🟢 Resolved Items

### Resolved: Offline Sync Manager Authentication Context (`syncManager.js`)
- **Location:** `client/src/lib/LocalSave/syncManager.js`
- **Issue:** `syncManager.js` imported `authClient` from `@better-auth/react` and called `authClient.post(...)` for `MARK_STEP_COMPLETE` and `SUBMIT_QUIZ` task actions. Because `authClient` is an authentication SDK and does not expose REST HTTP methods, replaying queued offline tasks caused runtime errors (`TypeError: authClient.post is not a function`).
- **Resolution:** Replaced `authClient.post` with `apiClient.post` (Axios instance configured with `withCredentials: true`), which automatically attaches the `better-auth.session_token` HTTP cookie. Background offline tasks now replay with full authenticated session privileges without breaking the earlier `SUBMIT_FEEDBACK` fix.
- **Verification:** Verified end-to-end via Puppeteer using real button clicks in `ModuleViewer` during CDP network offline emulation followed by native online reconnect sync to PostgreSQL `user_step_progress`.

---

### Resolved: Module Builder Form Reset Default Category (`useModuleSubmit.js`)
- **Location:** `client/src/hooks/module-builder/useModuleSubmit.js`
- **Issue:** The form reset handler reset the default category to `"General Safety / Protocols"`. PostgreSQL enforces a strict check constraint: `valid_modcat CHECK (modcat IN ('Flood', 'Earthquake', 'Fire', 'General'))`. Submitting a second module after a form reset without manually touching the category dropdown caused an unhandled database constraint violation.
- **Resolution:** Updated the reset default in `useModuleSubmit.js` to `"General"`.
- **Verification:** Verified via live Puppeteer wizard creation flow (Module 1 creation $\to$ form reset $\to$ Module 2 creation without touching category selector $\to$ 200 OK insert into `module_data`).

---

### Resolved: Empty Dashboard Catalog Navigation Dead Link (404)
- **Location:** `client/src/components/ui/dashboard/DashboardEnrolledList.jsx`
- **Issue:** The "Explore Catalog" call-to-action button in the empty-state dashboard navigated to `/user/catalog`, which did not exist in `App.jsx`, landing users on the 404 Not Found page.
- **Resolution:** Updated navigation target from `/user/catalog` to `/user/modules` (the active module catalog route).
- **Verification:** Verified via Puppeteer clicking "Explore Catalog" on a zero-enrollment resident account and confirming successful mount of the Catalog view.

---

### Resolved: TanStack Query Cache Collisions
- **Issue:** Multiple components sharing a TanStack Query cache key with independent mapping logic in `queryFn` caused two separate silent-data-corruption bugs.
- **Resolution:** All `"adminModules"` consumers now use properly namespaced sub-keys (`["adminModules", "management"]`, `["adminModules", "activeSyllabus"]`, `["adminModules", "overview"]`). `AdminApprovalModule` intentionally invalidates the root `["adminModules"]` key as a broadcast, which is correct. No remaining broad-key collisions exist in the codebase. Prefer `select` for view-specific shaping over shape-changing `queryFn`s for any key touched by more than one component.

---

### Resolved: `BACOLOR_BARANGAYS` Static Admin Filters
- **Previous location:** `client/src/constants/locations.js` (used in `ResidentRegistry.jsx`, `BarangayFilters.jsx`, `UserFilters.jsx`)
- **Issue:** Admin filtering components used a hardcoded flat string array. The backend mapped string names back to IDs via a subquery (`SELECT id FROM barangays WHERE name = $1`), creating brittleness if barangay names drifted.
- **Resolution:** All three components migrated to import `BARANGAY_LIST` from `client/src/constants/barangays.js` (the canonical `{id, name}` object array). `option` keys now use `b.id` and `value` continues to use `b.name` (matching the existing backend string-match logic, which has not changed). `client/src/constants/locations.js` has been permanently deleted from the repository.
- **Verification:** Verified `client` production build completes cleanly with 0 errors after removal.

---

### Resolved: Cross-Session SPA Cache Persistence
- **Issue:** Due to the nature of SPA routing (`navigate`), explicit client-side logouts did not trigger a hard browser refresh, meaning the TanStack `queryClient` persisted in the browser's heap memory across authentication boundaries. If User A logged out and User B logged in without a hard refresh, User B was served User A's cached data (e.g., certificates, dashboard metrics, admin lists) before background refetches fired.
- **Root Cause:**
  1. `UserCertificates.jsx` was pointed to a typo'd, orphaned key (`["userDashboardData"]`), bypassing targeted key invalidations entirely.
  2. Architectural failure to execute `queryClient.clear()` on logout.
- **Resolution:**
  - Synchronous `queryClient.cancelQueries()` and `queryClient.clear()` wired into all seven confirmed session-exit points: `UserSidebar.jsx`, `AdminSidebar.jsx`, `useDangerZone.js`, `useSystemAdmin.js`, `AdminMfaSetupPage.jsx`, `MaintenancePage.jsx`, `ActiveDevices.jsx`.
  - Standardized `UserCertificates.jsx` to use `["userDashboard"]`.
- **Verification:** Manually confirmed clean across four scenarios: resident-to-resident account switch, admin-to-admin account switch, in-flight request race (throttled network, logout mid-fetch), and remote session revocation via `ActiveDevices`. No stale or cross-user data observed in any case.

---

### Resolved: `AdminFeedbackManager.jsx` Missing Data Grid Features
- **Location:** `client/src/pages/admin/feedback/AdminFeedbackManager.jsx`
- **Issue:** The ticket queue mapped directly over the array of feedbacks with no client-side or server-side search, sort, or pagination.
- **Resolution:** Implemented client-side search (by subject, resident name, type), sort (newest/oldest/by status), and pagination (10 tickets per page). All three controls are combined in a single `useMemo` pipeline. Tab filters continue to function alongside search/sort and all reset the page to 1 on change. A "Showing X–Y of Z tickets" count row is displayed above the list. Pagination footer appears only when there is more than one page. Server-side pagination remains the correct long-term approach if ticket volume grows significantly.

---

### Resolved: Dead Columns in `feedbacks` Table
- **Location:** `public.feedbacks` table.
- **Issue:** The columns `reply`, `replied_by`, and `replied_at` were dead and fully stale. The feedback system was migrated to a threaded architecture (`feedback_messages` child table).
- **Resolution:** Dropped via `server/migrations/04_drop_dead_feedback_columns.sql`. Verified no active column references in `controllers/`, `services/`, or `routes/` before dropping — all `reply` hits in application code were confirmed to be `req.body.reply` (message text routed to `feedback_messages`), not column reads/writes on `feedbacks`.

---

### Resolved: Offline Queue Retry Strategy, Backoff & User-Facing Notifications
- **Location:** `client/src/lib/LocalSave/syncManager.js`, `client/src/lib/localDb.js`, `client/src/hooks/useNetworkSync.js`, `client/src/components/ui/UnsyncedQueueIndicator.jsx`, `client/src/pages/user/feedback/components/FeedbackHistoryCard.jsx`
- **Issue:** Queued offline writes previously incremented `retry_count` without backoff intervals or error classification, retrying indefinitely on reconnect/interval and lacking user notifications when requests permanently failed (e.g., 4xx client/validation rejections). Furthermore, only 3 of 8 offline action types were wired up in `syncManager.js`.
- **Resolution:**
  - **Error Classification:** Structured error classification distinguishing transient errors (5xx server errors, 429 rate limits, network timeouts when `navigator.onLine === true`) from terminal errors (4xx client/validation errors, unhandled schemas).
  - **Full-Jitter Exponential Backoff:** Implemented delay calculation $\text{delay} = \min(\text{MAX\_DELAY},\, \text{BASE\_DELAY} \times 2^{\text{retry\_count}-1}) \pm \text{jitter}$ (10s $\to$ 20s $\to$ 40s $\to$ 80s $\to$ 160s, capped at 30m).
  - **Offline Budget Protection:** Loop strictly checks `navigator.onLine` before and between tasks, pausing immediately without burning retry attempts when offline.
  - **Max Retry Cap & Fallback:** Cap set to 5 attempts; tasks that exhaust retries transition to `status: 'failed'` (`error_type: 'transient_exhausted'`).
  - **Complete Action Dispatch:** Added explicit handlers for all 8 queued actions (`SUBMIT_FEEDBACK`, `MARK_STEP_COMPLETE`, `SUBMIT_QUIZ`, `UPDATE_PROGRESS`, `COMPLETE_MODULE`, `UPDATE_NAME`, `UPDATE_AVATAR`, `UPDATE_NOTIFICATION_SETTINGS`) with a default terminal error catch for unknown actions.
  - **Dexie Schema Migration:** Added `localDb.version(2).stores({ sync_queue: "++sync_id, action_type, status, next_retry_at, retry_count, created_at" })` to ensure existing browser databases migrate cleanly.
  - **User-Facing UI:** Added `UnsyncedQueueIndicator` global drawer in `UserNavbar` and per-card `[Retry]` / `[Discard]` actions with live failure explanations in `FeedbackHistoryCard`.
- **Verification:** Verified via live Puppeteer tests against built React SPA with real DOM clicks, verifying "Sync Failed" badge rendering, retry queue dispatch, and drawer discard removal from IndexedDB.

---

### Resolved: Phase 4 Automated Recertification Lifecycle & Audit Preservation
- **Location:** `server/utils/certificateExpiryCron.js`, `server/services/modules/ModuleProgressService.js`
- **Issue:** Expired certificates remained stale without automated state transitions, residents had no proactive notice before credentials expired, and retaking expiring/expired courses lacked dedicated recertification renewal handlers in `ModuleProgressService.js`.
- **Resolution:**
  - **Two-Step Maintenance Cron:** Extended daily 1:00 AM cron to first transition active certs past `expires_at` to `'expired'`, then query 30-day active candidates with `recert_notified_at IS NULL` to dispatch branded email notices and timestamp `recert_notified_at = NOW()`.
  - **Renewal & Audit Logic:** When a resident completes an expiring or expired module, `ModuleProgressService.js` extends validity by 1 year, resets `recert_notified_at = NULL`, and preserves full audit history in `activity_log`.
- **Verification:** Exercised and confirmed via unit/integration test suites for plain renewals, revoked renewals, and cron notification email dispatching.

---

### Resolved: Phase 5 Two-Tier Rate Limiting on Certificate Verification
- **Location:** `server/middleware/rateLimiters.js`, `client/src/components/ui/certificates/CertificateVerificationModal.jsx`, `client/src/pages/admin/barangay/certifications/BarangayCertifications.jsx`
- **Issue:** Public QR scanning on `/api/certificates/verify/:token` required rate limiting to prevent enumeration attacks, but a strict static limit (50 req/15min) risked throttling legitimate field barangay administrators scanning multiple residents during community disaster response drills.
- **Resolution:**
  - **Dynamic Two-Tier Limiter:** Configured dynamic `keyGenerator` and function-valued `max` in `express-rate-limit`:
    - Anonymous requests $\to$ `anon_<ip>` with a **50 requests / 15 min** quota.
    - Authenticated admins $\to$ `admin_<userId>` with an elevated **500 requests / 15 min** quota.
  - **In-Portal Verification Modal:** Built `CertificateVerificationModal` featuring `html5-qrcode` camera viewfinder and manual token search, mounted directly on `BarangayCertifications.jsx`.
- **Verification:** Tested against live server with anonymous and authenticated Bearer tokens, confirming isolated bucket counters and rate limit headers.

---

### Resolved: Resident Registry Historical Completion Count & Account Standing Alignment
- **Location:** `server/services/users/UserService.js`, `client/src/pages/admin/barangay/registry/ResidentRegistry.jsx`
- **Issue:**
  1. The `Modules Completed` column in `ResidentRegistry.jsx` used mock fallbacks and risked computing live compliance rather than historical completions.
  2. The `STATE` column defaulted to `"Pending"` due to an unpopulated `r.status` property.
- **Resolution:**
  - **Historical Completion Query:** Added correlated scalar subquery in `UserService.getAllUsers`: `SELECT COUNT(*)::int FROM certificates c WHERE c.user_id = u.id AND c.status != 'revoked'`, accurately reflecting all completed modules without expiry filtering.
  - **Real Account Standing:** Mapped `STATE` directly to `banned` and `archived` database flags (`Banned` $\to$ Red, `Archived` $\to$ Slate, `Active` $\to$ Emerald).
  - Replaced raw UUID identifiers with resident email subtitles (`user@email.com`) and added search debouncing.
- **Verification:** Verified with live database queries and browser screenshots displaying accurate varying counts and badges.

---

### Resolved: User Portal Navigation Routing & Header Matching
- **Location:** `client/src/components/layouts/UserNavbar.jsx`
- **Issue:** The navbar header title fell back to `"User Dashboard"` when navigating to `/user/feedback` and dynamic subroutes because `pageTitles` was a static key-value map lacking feedback and subroute entries.
- **Resolution:** Implemented dynamic prefix matching in `getPageTitle(pathname)` covering `/user/feedback` $\to$ `"Feedback & Support"`, `/user/certificates/view` $\to$ `"Certificate Viewer"`, `/user/modules/:id/details` $\to$ `"Module Details"`, and all other resident routes.
- **Verification:** Verified live via browser automation across all user routes.

---

### Resolved: Resident Portal UI/UX Modernization & Skeleton Loading System
- **Location:** `client/src/pages/user/` (`ModuleCatalog.jsx`, `Certificates.jsx`, `EnrolledModules.jsx`, `Announcements.jsx`, `FeedbackHistory.jsx`, `ModuleDetailsPage.jsx`)
- **Issue:**
  1. Resident pages displayed unstyled text placeholders (`"Loading announcements..."`, `"Loading communication history..."`) or spinners, causing visual layout shifts.
  2. `ModuleCatalog.jsx` and `EnrolledModules.jsx` lacked debouncing and category filtering.
  3. `ModuleCatalog.jsx` pagination was disconnected from the grid with awkward bottom whitespace.
  4. `Certificates.jsx` contained artificial filler cards that cluttered the view.
- **Resolution:**
  - **Full Skeleton System:** Implemented full-fidelity animated skeletons for announcements, feedback tickets, module details syllabus, and certificate cards.
  - **Catalog & Enrolled Modernization:** Added `useDebounce(..., 350)` on all search inputs, dynamic category dropdown filters, and an 8-item page layout (`itemsPerPage = 8`) with cohesive pagination.
  - **Prestigious Credential Card:** Redesigned `CertificateCard.jsx` to render an official credential presentation with control numbers, issue/expiry matrix, and View/Download actions in a balanced 2-column layout.
- **Verification:** Verified across all resident pages with browser screenshots and clean `npm run build` production bundles.

### Resolved: Public Certificate Verification Deleted-Account Anonymization & Security Hardening
- **Location:** `server/services/modules/ModuleProgressService.js`, `server/routes/certificatesRoutes.js`, `server/controllers/certificatesController.js`
- **Issue:** 
  1. The verification query used an `INNER JOIN` on `public."user" u ON c.user_id = u.id`. When a user exercised their Right to Be Forgotten and deleted their account (`user_id = NULL`), legitimate unexpired certificates returned `404 Not Found`, incorrectly making authentic credentials appear fraudulent.
  2. The public lookup endpoint required strict rate limiting to prevent automated scraping.
- **Resolution:**
  - **LEFT JOIN & Fallback:** Updated query to `LEFT JOIN public."user" u ON c.user_id = u.id` with `COALESCE(u.name, c.anonymized_name, 'Archived Resident') AS learner_name`. Authentic certificates of deleted accounts now verify cleanly with active status and anonymized learner names.
  - **Strict UUID Pre-validation:** Rejects non-UUID strings before querying PostgreSQL to close off integer enumeration attacks (`/verify/1`, `/verify/2`).
  - **Live State Computation:** Evaluates `status` and `expires_at < NOW()` in real-time at scan time with zero frozen cache.
  - **Two-Tier Postgres Rate Limiting:** 50 requests / 15 min for public unauthenticated scans; 500 requests / 15 min for authenticated admins, backed by PostgreSQL persistence.
- **Verification:** Tested against PostgreSQL with active user, deleted account (`user_id = NULL`), expired timestamp, and revoked status; all 4 returned exact expected payloads.

---

### Resolved: Public Verification Page Brand Alignment & Authority Badging
- **Location:** `client/src/pages/public/VerifyCertificate.jsx`
- **Issue:** The public certificate verification screen used default blue button styling inconsistent with the Bacolor LMS red brand identity and lacked issuing authority badges and explicit Data Privacy Act disclosures.
- **Resolution:**
  - **Brand Theming:** Updated CTA buttons and input focus rings to primary brand red (`bg-red-600 hover:bg-red-700`).
  - **Issuing Authority Badge:** Added official municipal credential badge: *"Issued under the Authority of Bacolor MDRRMO & Local DRRMC (Municipality of Bacolor, Province of Pampanga)"*.
  - **R.A. 10173 Compliance Notice:** Added a dedicated footer citing Republic Act No. 10173 (Data Privacy Act of 2012), affirming that only essential qualification metadata is displayed on public routes.
- **Verification:** Verified via Puppeteer in Chromium and compiled with 0 errors via `npm run build`.

---

### Resolved: Barangay Admin Dashboard Header Card Modernization & Search Debouncing
- **Location:** `client/src/pages/admin/barangay/workspace/WorkspaceOverview.jsx`, `client/src/pages/admin/barangay/registry/ResidentRegistry.jsx`
- **Issue:**
  1. The Barangay Admin overview lacked alignment with the unified MDRRMO header card and did not display localized jurisdiction names.
  2. The Resident Registry search filter re-computed on every single keystroke.
- **Resolution:**
  - **MDRRMO-Aligned Header:** Integrated unified header card displaying `{formattedBarangayName} Community Portal` (e.g. *Barangay Mesalipit Community Portal*), live connection status, and client-side CSV roster export.
  - **Search Debouncing:** Added 300ms `useDebounce` hook to search inputs covering `name`, `email`, and `status`.
- **Verification:** Verified via live Puppeteer in Chromium and confirmed 0 build errors.

---

### Resolved: Database Indexing & Query Plan Optimization
- **Location:** `server/migrations/schema.sql`, live PostgreSQL `LMS_db`
- **Issue:** Multi-table joins across `certificates`, `module_activity`, and `feedbacks` were running sequential scans as tables grew.
- **Resolution:** Executed a live database migration that created 6 targeted composite and partial indexes:
  - `idx_certificates_user_status` — composite on `(user_id, status)` for certificate lookups and filtering.
  - `idx_certificates_expiry_sweep` — partial index on `(status, expires_at) WHERE status = 'active'` for the daily 1:00 AM recertification cron.
  - `idx_certificates_verification_token` — index on `verification_token` for QR-code scan verification endpoint.
  - `idx_certificates_user_non_revoked` — partial index on `(user_id) WHERE status != 'revoked'` for the historical completion scalar subquery in `UserService.getAllUsers`.
  - `idx_module_activity_user_modstatus` — composite on `(user_id, modstatus)` replacing two separate single-column indexes.
  - `idx_feedbacks_user_status_created` — composite on `(user_id, status, created_at DESC)` for the feedback queue admin and user views.
- **Verification:** Confirmed all 6 indexes exist in `LMS_db` via `pg_indexes` query. `schema.sql` updated to reflect the new state.

---

### Resolved: Offline Feedback Reply Queuing & Reconnect Sync Engine
- **Location:** `client/src/lib/LocalSave/syncManager.js`, `client/src/pages/user/feedback/hooks/useFeedbackHistory.js`, `client/src/pages/user/feedback/hooks/useFeedbackSubmit.js`, `client/src/pages/user/feedback/components/FeedbackHistoryCard.jsx`, `client/src/components/ui/UnsyncedQueueIndicator.jsx`
- **Issue:** While initial ticket creation supported offline queuing (`SUBMIT_FEEDBACK`) in Dexie `localDb.sync_queue`, threaded replies in `useFeedbackHistory.js` had no offline branch and failed immediately when disconnected.
- **Resolution:**
  - Added `REPLY_FEEDBACK` action handler to `syncManager.js` (`dispatchTask` calling `PUT /api/feedbacks/:id/reply`, `getActionDescription`).
  - Wrapped `userReplyMutation` in `useFeedbackHistory.js` with `networkMode: "always"` and offline guards/network failure catches that queue tasks into Dexie `localDb.sync_queue`.
  - Merged offline queued replies seamlessly into `submissions` message threads with pending badge indicators and inline `Retry` / `Discard` buttons for failed attempts.
  - Added `REPLY_FEEDBACK` icon handling in `UnsyncedQueueIndicator.jsx`.
  - Modernized React Query cache invalidations across feedback hooks to TanStack Query v5 object syntax `{ queryKey: ["userFeedbacks", userId] }`.
- **Verification:** Verified end-to-end via automated Puppeteer Chromium test:
  1. Authenticated resident and loaded `/user/feedback`.
  2. Severed network via Chrome DevTools Protocol (`Network.emulateNetworkConditions: { offline: true }`).
  3. Submitted follow-up reply while offline: verified instant toast notification, local Dexie `sync_queue` persistence, and inline "Queued offline (pending sync)" badge.
  4. Restored network (`offline: false`): verified automated background sync dequeuing and persistence to PostgreSQL `feedback_messages`.

---

### Resolved: Zero-Network Local Certificate QR Code Generation
- **Location:** `client/src/pages/user/certificates/certTemplate.jsx`
- **Issue:** The PDF completion certificate was fetching verification QR codes dynamically from an external third-party service (`api.qrserver.com`), introducing network failure risks during offline access, rate-limiting vulnerabilities, and external dependency leakage.
- **Resolution:**
  - Integrated local client-side QR generation using the `qrcode` engine (`QRCode.toDataURL`).
  - Rendered verification URLs (`/verify?token=...`) directly as embedded base64 PNG data URIs inside `@react-pdf/renderer`'s `<Image />` component.
  - Eliminated all external network requests during PDF certificate preview, generation, and downloading.
- **Verification:** Verified via live Puppeteer automated test:
  1. Loaded certificate viewer route `/user/certificates/view?token=...`.
  2. Monitored all outgoing network requests during page load and PDF render: confirmed **0 external HTTP requests**.
  3. Verified base64 Data URI generation and confirmed PDF download action renders without errors.

---

### Resolved: Gamification Mastery Badge Scope Calculation
- **Location:** `server/services/users/DashboardService.js`, `client/src/pages/user/profile/Profile.jsx`, `client/src/components/ui/profile/BadgesSection.jsx`
- **Issue:** Hazard mastery badges (`Flood Master`, `Earthquake Expert`, `Fire Safety Vanguard`) evaluated unlock progress solely against the resident's enrolled modules (`enrolledModules.filter()`) instead of the total system course catalog. A resident enrolled in only 1 of 3 flood modules would immediately receive the "Flood Master" badge upon finishing that single module.
- **Resolution:**
  - Enhanced backend `DashboardService.getDashboardData` to query and return system-wide catalog category totals (`categoryTotals: { flood: 3, earthquake: 3, ... }`).
  - Updated `Profile.jsx` to pass `categoryTotals` to `BadgesSection.jsx`.
  - Refactored `BadgesSection.jsx` to evaluate badge unlock status and progress text (`${completed}/${catalogTotal} Completed`) strictly against full catalog category volume.
- **Verification:** Verified via Puppeteer automated test:
  1. Initialized resident with 1 completed flood module out of 3 total flood modules in the database.
  2. Rendered `/user/profile` and evaluated the Badges & Achievements section in the DOM.
  3. Confirmed "First Step Taken" was unlocked (1/1 completed) while "Flood Master" remained accurately **Locked** displaying `1/3 Completed` (and "Earthquake Expert" displayed `0/3 Completed`).

---

### Resolved: Dynamic Certificate Signatories & Barangay Metadata
- **Location:** `server/services/users/UserService.js`, `client/src/pages/user/certificates/certTemplate.jsx`
- **Issue:** PDF certificate signatories and titles were hardcoded static mock strings (`"Hon. Juan Dela Cruz"` and `"System Administrator"`).
- **Resolution:**
  - Upgraded `UserService.getCertificateData` to query real barangay administrator names assigned to the learner's registered barangay (`SELECT ba.name FROM "user" ba WHERE ba.role = 'barangay_admin' AND ba.barangay_id = u.barangay_id`) and senior municipal MDRRMO leadership (`head_mdrrmo_admin` / `mdrrmo_admin`).
  - Updated `certTemplate.jsx` to dynamically render authentic official signatures, localized resident barangay context (`Authorized Resident — Brgy. <Barangay>`), and structured institutional titles (`Barangay Captain — Brgy. <Barangay>`, `Municipal DRRMO Head`).
- **Verification:** Verified via automated Puppeteer test:
  1. Authenticated resident assigned to Barangay Concepcion.
  2. Intercepted `GET /api/users/certificates/:token` and asserted dynamic presence of `barangay_admin_name`, `mdrrmo_officer_name`, and `resident_barangay`.
  3. Verified that the PDF generation and download link successfully rendered the live signatories with zero hardcoding.

---

### Resolved: Client PDF Web Worker CSP Directive & Browser Buffer Compatibility
- **Location:** `client/index.html`, `server/server.js`, `client/vite.config.js`, `client/src/main.jsx`, `client/src/pages/user/certificates/certTemplate.jsx`
- **Issue:** `@react-pdf/renderer` PDF compilation in background Web Workers was blocked by the browser due to missing `worker-src 'self' blob:` and `script-src ... blob:` in the client SPA CSP meta tag. When the worker was blocked, the engine's main-thread fallback threw `Buffer is not defined` and `Module "buffer" has been externalized`.
- **Resolution:**
  - Configured matching CSP directives across `client/index.html` and `server/server.js` (`worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval' blob:;`).
  - Added the browser `buffer` npm package to `client/package.json`.
  - Configured Vite resolution alias (`buffer: "buffer/"`) and polyfilled `window.Buffer` in `main.jsx` and `certTemplate.jsx` to support in-browser binary stream encoding without Node built-in collisions.
- **Verification:** Verified via automated Puppeteer test:
  1. Loaded `/user/certificates/view?token=...` in Chromium.
  2. Confirmed 0 CSP violations, 0 console errors, and successful PDF iframe rendering as a blob URL (`blob:http://localhost:5173/...`).
  3. Confirmed the action button successfully transitioned to an active `Download PDF` state.

---

### Resolved: Destructive Admin Actions Hardening (`destructiveActionLimiter`, Structural Role Validation & Bulk-Archive Confirm)
- **Location:** `server/routes/admin/adminRoutes.js`, `server/middleware/rateLimiters.js`, `server/controllers/admin/user-management/banManagement.js`, `server/controllers/admin/user-management/archiveManagement.js`, `client/src/pages/admin/system/users/UserManagement.jsx`
- **Issue:** Destructive administrative operations (banning users, archiving individual accounts, bulk archiving up to 50 users) required strict defense-in-depth protection against brute-force automation, role-escalation bypasses, and accidental clicks.
- **Resolution:**
  - **Rate Limiting:** Mounted PostgreSQL-backed `destructiveActionLimiter` (strict max 5 requests / 15 min keyed by `req.user.id`) across `/users/:id/ban`, `/users/:id/unban`, `/users/:id/archive`, and `/users/bulk-archive`, and `adminWriteLimiter` (max 20 / 15 min) on role updates.
  - **Structural Role & Scope Checks:** Implemented server-side role validation in controller logic with `SECURITY_FAULT` exception handlers, ensuring `barangay_admin` cannot operate outside their scoped `barangay_id` and non-unscoped roles cannot execute destructive mutations even if route gates were misconfigured.
  - **Frontend Confirmation:** Added `window.confirm` modal dialogues in `UserManagement.jsx` prior to dispatching `bulk_archive` mutations.
- **Verification:** Audited route middleware stacks, verified controller exception throwing, and confirmed frontend confirmation triggers in codebase.

### Resolved: Bounded Concurrency Parallel Media Uploads in Module Builder (`useModuleSubmit.js`)
- **Location:** `client/src/hooks/module-builder/useModuleSubmit.js`
- **Issue:** Media attachments across staged module steps were previously uploaded sequentially in a synchronous `for` loop, causing publishing bottlenecks for media-heavy modules on slower barangay connections.
- **Resolution:**
  - Implemented a worker-pool bounded concurrency mechanism capping simultaneous in-flight uploads at $\le 3$ requests.
  - Strict step order is preserved in the resulting `uploadedFlows` payload regardless of network completion ordering.
  - Fail-fast error propagation ensures any individual failure halts subsequent uploads and returns the exact Step-indexed error message.
  - Replaced per-item toast notifications with an aggregate counter (`"Uploading media (X of Y completed)..."`).
- **Verification:** Verified via automated Puppeteer test with 5 concurrently staged media attachments. Network timeline confirmed peak concurrency capped at exactly 3, with overlapping in-flight execution and 100% preserved step ordering.

---

### Resolved: `activity_log` Ghost Entries Cleanup (Deleted Test Fixture References)
- **Location:** PostgreSQL `activity_log` table
- **Issue:** Historical automated test runs generated 3 activity log entries (act_id: 276, 293, 300) referencing ephemeral fixture modules (`"RESIDENT AUDIT TEST - 1787303460308"` and `"PUPPETEER OFFLINE SYNC TEST"`) that were subsequently deleted from `module_data`.
- **Resolution:** Permanently purged the 3 orphaned test-fixture records via `DELETE FROM activity_log WHERE act_id IN (276, 293, 300)`. Hard deletion was selected over a soft-delete column to preserve the simple append-only architecture of the production audit log table without requiring `WHERE is_deleted = false` filter clauses across all reporting, CSV export, and log inspection endpoints.
- **Verification:** Verified via exact SQL `LEFT JOIN` and `NOT EXISTS` queries against `module_data`, confirming 0 orphaned/ghost rows remaining in `activity_log`.

---

### Resolved: Resident Management vs. Certification Roster Data Source Alignment
- **Location:** `server/services/users/UserService.js`, `server/controllers/admin/barangayController.js`, `client/src/pages/admin/barangay/registry/ResidentRegistry.jsx`
- **Audit Findings:**
  - **Modules Completed:** Confirmed that both Resident Management and the Certification Roster derive completion metrics from the same underlying PostgreSQL `certificates` table.
  - **"STATE" Column Semantics:** Confirmed that the "STATE" column in Resident Management represents **account moderation status** (`Active` / `Banned` / `Archived`) sourced from `user.banned` and `user.archived`, whereas the Certification Roster represents **training compliance status** (`Active` / `Expiring Soon` / `Expired` / `Revoked`).
- **Verification:** Audited both SQL queries side-by-side and verified UI column mappings in `ResidentRegistry.jsx`.

---

### Resolved: User Distribution Donut vs. Total Users KPI Card Parity (40 = 40)
- **Location:** `server/controllers/admin/systemStatsController.js`
- **Issue:** Previous count mismatch (41 vs 42) was root-caused to the exclusion of the `head_mdrrmo_admin` role in the donut chart filter.
- **Resolution:** Updated the filter to `WHERE role IN ('mdrrmo_admin', 'head_mdrrmo_admin')`.
- **Verification:** Verified against live PostgreSQL database: Residents (27) + Barangay Admins (3) + MDRRMO Admins (8) + System Admins (2) = **40**; Total Users `COUNT(*)` = **40**. Parity is 100% verified.

---

### Resolved: System Traffic Chart 24h Bucketing & Spike Verification
- **Location:** `server/controllers/admin/systemStatsController.js:getTrafficAnalytics`
- **Audit Findings:** Investigated the flat-then-spike chart pattern. Confirmed that the SQL `generate_series` hourly bucketing query is mathematically correct and accurately groups distinct active users from `activity_log` per 1-hour window. The flat zero period followed by an activity peak reflects real user interaction intervals in development/test environments (idle hours vs active test execution), not a timestamp collapse or timezone defect.
- **Verification:** Verified 24-hour SQL bucket breakdown against recent `activity_log` entries in PostgreSQL.

---

### Resolved: PostgreSQL Foreign Key Constraint Deduplication
- **Location:** PostgreSQL schema: `public.certificates`, `public.module_activity`, `public.user_step_progress`, `public.questions`
- **Issue:** Historical migrations generated 66 duplicate foreign key constraints (`fk_user` repeated 16 times per table, `fk_module` repeated 4 times), creating redundant constraint evaluation checks on every insert/update.
- **Resolution:** Executed a transactional migration dropping all 66 duplicate constraint handles and establishing single, canonical named foreign keys (`fk_certificates_user_id`, `fk_module_activity_user_id`, `fk_module_activity_mod_id`, `fk_user_step_progress_user_id`, `fk_questions_mod_id`).
- **Verification:** Verified via `information_schema.table_constraints` introspection; total foreign key constraints reduced from 90 to 24 distinct canonical relations.

---

### Resolved: Module Builder Publish Double-Submit Guard (`ModuleBuilderWizard.jsx`)
- **Location:** `client/src/pages/admin/mdrrmo/module-management/builders/ModuleBuilderWizard.jsx`
- **Issue:** The "Submit for Review" / "Publish" button lacked an `isSubmitting` disabled guard. Rapid double-clicking or latency spikes could trigger concurrent `POST /api/modules` network calls, resulting in duplicate module creation in `module_data` (where `mod_id` is an auto-incrementing serial key with no natural database deduplication key).
- **Resolution:** Added dedicated React `isSubmitting` state initialized to `false`, wrapped `handleSubmitWrapper` in a robust `try ... finally` block resetting `setIsSubmitting(false)`, bound `disabled={isSubmitting}` to the submit button, and rendered an active `<Spinner />` with `"Submitting..."` feedback.
- **Verification:** Verified via automated Puppeteer Chromium test simulating rapid double-clicks on the submit button. Instrumentation confirmed the button transitioned to `disabled={true}` with `"Submitting..."` immediately upon the first click, blocked the second trigger, and a live PostgreSQL query confirmed that exactly 1 module record was created in `module_data`.

---

### Resolved: Module Builder Step Components Folder Colocation
- **Location:** `client/src/pages/admin/mdrrmo/module-management/`
- **Issue:** Step editor components (`LearningContentEditor`, `QuizEditor`, `SituationalEditor`, `PriorityActionEditor`, `HazardIdentificationEditor`, `ActionSequenceEditor`) were previously placed in an orphaned directory `step-components/` outside of `builders/`, creating fragmented module-builder architectural hierarchies.
- **Resolution:** Relocated all 6 step editor sub-components into `builders/steps/`, standardized all relative utility/modal import paths, updated `AssessmentEditor.jsx` and `StepBuilder.jsx` import paths to `./steps/`, and deleted the legacy `step-components/` directory.
- **Verification:** Verified with production build `npm run build` (0 errors) and automated Puppeteer test traversing and interacting with all 6 step editors in the live wizard.

---

### Resolved: Certificate Verification Modal Decomposition
- **Location:** `client/src/components/ui/certificates/CertificateVerificationModal.jsx`
- **Issue:** The verification modal previously accumulated 441 lines in a single file, mixing HTML5 camera scanner state, manual token parsing, error states, and credential preview cards into one monolith.
- **Resolution:** Modularized into 4 single-responsibility sub-components under `client/src/components/ui/certificates/scanner/`:
  - `CameraScannerView.jsx` (Html5Qrcode scanner lifecycle, viewport, and fallback controls)
  - `ManualTokenForm.jsx` (Token/URL input and submit trigger)
  - `VerificationResultCard.jsx` (Status banner, metadata grid, and verification badge)
  - `VerificationErrorState.jsx` (Error explanation and retry actions)
- **Verification:** Verified via automated Puppeteer test covering Camera tab mounting, Manual tab switching, invalid token 404 error rendering, and live database certificate token verification preview.

---

### Resolved: Barangay Certifications & Resident Registry View Decomposition
- **Location:** `client/src/pages/admin/barangay/certifications/BarangayCertifications.jsx`, `client/src/pages/admin/barangay/registry/ResidentRegistry.jsx`
- **Issue:** Administrative views exceeded 400 and 340 lines, mixing KPI summaries, complex debounced search/dropdown filter bars, data tables, pagination, and dropdown action modals.
- **Resolution:** Decomposed into clean sub-components in domain-specific folders:
  - `certifications/components/`: `CertificationsKpiRow.jsx`, `CertificationsFilterBar.jsx`, `CertificationsTable.jsx`
  - `registry/components/`: `ResidentRegistryFilterBar.jsx`, `ResidentRegistryTable.jsx`
- **Verification:** Verified with production build `npm run build` (0 errors) and automated Puppeteer test covering search input debouncing, reset filters, action dropdown menus, and archive confirmation modals.

---

### Resolved: Barangay Workspace Overview Decomposition
- **Location:** `client/src/pages/admin/barangay/workspace/WorkspaceOverview.jsx`
- **Issue:** The main barangay overview accumulated 559 lines, mixing data queries, 5 KPI stat cards, SVG compliance donut metrics, paginated disaster curriculum cards, 5 administrative quick action triggers, CSV report generation, and monitored resident tables.
- **Resolution:** Extracted into 5 modular, single-responsibility sub-components under `client/src/pages/admin/barangay/workspace/components/`:
  - `WorkspaceKpiGrid.jsx` (5 domain StatCards)
  - `CommunityComplianceCard.jsx` (SVG donut ring and certified/pending legend)
  - `CurriculumReadinessCard.jsx` (Module completion progress bars, empty state, and page controls with `moduleLimit = 5`)
  - `WorkspaceQuickActions.jsx` (5 administrative action buttons with navigation and modal triggers)
  - `MonitoredCitizenTable.jsx` (Searchable citizen table with row selection and Inspector triggers)
  - `WorkspaceOverview.jsx` (Streamlined coordinator down to ~190 lines)
- **Verification:** Verified with production build `npm run build` (0 errors) and automated Puppeteer end-to-end browser test validating all 5 KPI cards, compliance ring, curriculum pagination, citizen table/inspector, real CSV export blob generation, and all 5 Quick Action triggers individually.

### Resolved: Admin Routes & Analytical Controllers Backend Modularization (Wave 1)
- **Location:** `server/routes/admin/adminRoutes.js`, `server/controllers/admin/mdrrmoOverviewController.js`, `server/controllers/admin/barangayController.js`
- **Issue:** Monolithic 318-line `adminRoutes.js` and controllers embedded with heavy database queries.
- **Resolution:**
  - Decomposed `adminRoutes.js` into 4 dedicated Express sub-routers (`adminUserRoutes.js`, `adminSystemRoutes.js`, `adminMdrrmoRoutes.js`, `adminBarangayRoutes.js`).
  - Extracted SQL analytical queries into `server/services/admin/MdrrmoOverviewService.js` and `server/services/admin/BarangayAdminService.js`.
- **Verification:** Verified with 18-point HTTP test suite asserting 100% exact response JSON schemas, 200 OK statuses, 401 unauthenticated barriers, 403 RBAC barriers, and multi-tenant `barangay_id` jurisdiction isolation.

---

### Resolved: Backend Services & Utilities Modularization (Wave 2)
- **Location:** `server/utils/emailTemplates.js`, `server/controllers/admin/activityLogController.js`, `server/controllers/admin/systemStatsController.js`, `server/controllers/admin/adminFeedbacks.js`, `server/controllers/users/feedbackController.js`
- **Issue:** Several utility files and controllers contained bloated logic, direct database aggregation, and inline SQL, increasing maintainability overhead and blurring separation of concerns.
- **Resolution:**
  - **Email Templates Decomposition:** Modularized 247-line `server/utils/emailTemplates.js` into focused template modules under `server/utils/templates/` (`emailWrapper.js`, `resetPassword.js`, `verification.js`, `securityAlerts.js`, `otp.js`, `adminPasswordReset.js`, `recertificationReminder.js`) while maintaining 100% backward-compatible function signatures and export contracts.
  - **Activity Log & Telemetry Extraction:** Extracted database operations into `server/services/admin/ActivityLogService.js` and `server/services/admin/SystemStatsService.js`. Preserved strict byte-for-byte CSV headers (`ID,User ID,User Name,Role,Date,Action`) and formatting escapes in audit log exports.
  - **Feedback & Offline Sync Contract Service:** Extracted feedback communication logic into `server/services/feedback/FeedbackService.js`. Maintained exact JSON and HTTP status contracts for `POST /api/feedbacks` (201 Created), resident replies, and admin triage threads.
- **Verification:** Verified with master 28-point automated test suite covering:
  - 8 email template rendering evaluations.
  - 18 backend endpoint and RBAC authorization boundary checks.
  - Live offline-sync replay simulation matching `syncManager.js` dispatch queue.
  - Full Vite production build compilation.
  - Interactive Puppeteer browser E2E test suite across all admin workflows.

---

## 🟡 Open / Active Technical Debt & Optimization Items

### 1. Server-Side Pagination & Cursor Querying for High-Scale Endpoints
- **Location:** `client/src/pages/admin/feedback/AdminFeedbackManager.jsx`, `client/src/pages/admin/barangay/registry/ResidentRegistry.jsx`, `client/src/pages/admin/barangay/certifications/BarangayCertifications.jsx`, `client/src/pages/user/catalog/ModuleCatalog.jsx`
- **Description:** Several administrative and user views currently fetch the entire dataset via REST API and execute filtering, sorting, and pagination on the client side in `useMemo`.
- **Architectural Impact:** While performant for small-to-medium datasets (< 500 records), this pattern will degrade performance as resident accounts, certification records, and feedback tickets scale into thousands.
- **Recommended Action:**
  - Update backend endpoints (`GET /api/users`, `GET /api/feedbacks/admin`, `GET /api/certificates`) to accept `page`, `limit`, `search`, and `filter` query parameters with SQL `LIMIT` / `OFFSET` or keyset/cursor pagination.
  - Connect React components to pass pagination query parameters into React Query hooks.

---

### 2. Large Production Bundle Chunks & Code Splitting
- **Location:** `client/src/` build output
- **Description:** Vite build output warns that several chunk sizes exceed 500 kB after minification:
  - `dist/assets/certTemplate-*.js` (~1.43 MB): Includes PDF rendering engines, Canvas utilities, and embedded vector graphics.
  - `dist/assets/index-*.js` (~540 kB): Core React, TanStack Query, React Router, and common libraries bundle.
  - `dist/assets/ModuleManagement-*.js` (~470 kB): TipTap rich text suite, drag-and-drop canvas, and SVG icon sets.
  - `dist/assets/CertificateVerificationModal-*.js` (~380 kB): Certificate tables and `html5-qrcode` scanner bundle.
  - `dist/assets/PieChart-*.js` (~330 kB): Charting engine.
- **Recommended Action:**
  - Use `React.lazy()` and dynamic `import()` for large admin tools (`ModuleBuilderWizard`, `AdminFeedbackManager`, `BarangayCertifications`), PDF generators (`certTemplate`), and charting components.
  - Configure manual chunking in `vite.config.js` (`build.rollupOptions.output.manualChunks`) to split vendor libraries (e.g. `html5-qrcode`, `jspdf`, `chart.js`) into separate cached chunks.

---

### 3. Certificate Revocation Authority — MDRRMO Municipal Override
- **Current State:** Only `barangay_admin` can revoke certificates, correctly scoped to their own barangay jurisdiction.
- **Gap:** The original disaster readiness specification designates MDRRMO as having ultimate verification authority to revoke any certificate municipality-wide if fraudulent completion or procedural non-compliance is detected. No revoke action currently exists on the MDRRMO Municipal Certification Analytics portal.
- **Recommended Action:**
  - Add MDRRMO revocation capability with mandatory reason logging.
  - Dispatch automated notifications (in-app alert bell and Nodemailer email) to all assigned barangay administrators for the affected sector when an MDRRMO override revocation occurs.

---

### 4. Real-Time Push Notifications (WebSocket / SSE) vs. Polling Overhead
- **Location:** `client/src/` (Global banners, notification dropdowns, feedback manager, system health)
- **Description:** The system currently relies on TanStack Query `refetchInterval` polling (ranging from 5s on `SystemHealth` to 30s/60s on alerts, feedback, and certifications).
- **Architectural Impact:** Under high concurrent resident usage, continuous HTTP polling generates steady baseline database queries even when data has not changed.
- **Recommended Action:**
  - Implement a lightweight Server-Sent Events (SSE) or WebSocket gateway for urgent real-time events (e.g. MDRRMO disaster broadcast alerts, new high-priority resident feedback, emergency credential revocations).
  - Retain React Query polling as a secondary fallback for offline resilience.

---

### 5. Module Builder Wizard Editing Mode (`PUT /api/modules/:id`)
- **Location:** `client/src/pages/admin/mdrrmo/module-management/builders/ModuleBuilderWizard.jsx`, `client/src/hooks/useModuleBuilder.js`
- **Description:** The frontend wizard contains scaffolding for `editingModuleId`, but full module editing (hydrating existing level/step sequences, diffing questions, and updating published syllabi) is deferred on the product roadmap.
- **Status:** Explicitly deferred pending product roadmap approval. Requires a dedicated `PUT /api/modules/:id` backend route and database transaction logic for step reconciliation.

---

### 6. Sequence Canvas Flow Configuration Stub (`SequenceCanvas.jsx`)
- **Location:** `client/src/pages/admin/mdrrmo/module-management/builders/SequenceCanvas.jsx:L76-L81`
- **Description:** A "Set By" `<select>` element containing options `Sequential` and `Optional` is present in the builder canvas header. It is currently unmanaged (no `value` prop, no `onChange` handler, and not part of the module form payload).
- **Architectural Reality:** The PostgreSQL schema enforces a strictly linear progression model (`UNIQUE (level_id, step_order)`). `ModuleProgressService.js` and `ModuleViewer.jsx` compute progress strictly linearly ($1 \to 2 \to 3$).
- **Recommended Action:**
  - If progression remains strictly linear: replace the `<select>` with a decorative status badge (`Flow: Sequential`) or remove it to prevent administrative confusion.
  - If conditional branching is desired in the future: expand schema support (`is_optional`, `flow_type`) and update `ModuleProgressService`.

---

### 7. Mock Data & Scaffolding Stubs in Resident Settings (`Settings.jsx`)
- **Location:** `client/src/components/settings/LoginHistory.jsx`, `client/src/components/settings/LocalizationSettings.jsx`, `client/src/components/settings/HelpSupport.jsx`
- **Description:**
  - `LoginHistory.jsx`: Renders a 100% hardcoded mock array of devices and IP addresses (`"iPhone 13"`, `"MacBook Pro"`, `"San Fernando, Pampanga"`, `"112.198.xxx.xx"`) with an unhandled "View Full History" button.
  - `LocalizationSettings.jsx`: Language select and Theme buttons are unmanaged UI scaffolding with no active i18n or theme engine bindings.
  - `HelpSupport.jsx`: The "Contact Support" button has no `onClick` or `Link` handler and does not navigate to `/user/feedback`.
- **Recommended Action:**
  - Connect `LoginHistory.jsx` to live user sessions from Better-Auth's `session` table or PostgreSQL `activity_log`.
  - Wire `HelpSupport.jsx` button to route directly to `/user/feedback`.
  - Add functional persistence or hide unimplemented localization/theme scaffolding until full i18n is scheduled.

---

### 8. TanStack Query v5 Syntax & Deprecation Inconsistencies
- **Location:** `client/src/hooks/useModuleViewer.js`, `client/src/pages/user/dashboard/Dashboard.jsx`, `client/src/pages/user/hooks/usePaginatedAnnouncements.js`
- **Description:**
  - `useModuleViewer.js` and `useFeedbackHistory.js` use legacy array syntax for invalidations: `queryClient.invalidateQueries(["userDashboard"])` instead of TanStack Query v5 object syntax `{ queryKey: ["userDashboard"] }`.
  - `usePaginatedAnnouncements.js` passes `keepPreviousData: true` (deprecated in v5) instead of `placeholderData: keepPreviousData`.
  - `Dashboard.jsx` specifies `onError` inside `useQuery` (ignored in TanStack Query v5).
- **Recommended Action:**
  - Modernize all resident query hooks to standard TanStack Query v5 object schemas.

---

### 9. Dead Code Removal: Service Worker Background Sync & Legacy DB (`service-worker.js`)
- **Location:** `client/public/service-worker.js:L145-L244`
- **Description:** `service-worker.js` defines a `sync` event listener and `replayWriteQueue()` function targeting a stale database (`"BacolorLMSOfflineDB"` and `"writeQueue"`).
- **Architectural Reality:** The client does not register `sync` tags (`registration.sync.register`), and all real offline queueing/sync execution runs on the React thread via Dexie `LMS_OfflineDB` / `syncManager.js`.
- **Recommended Action:**
  - Safely delete the orphaned `replayWriteQueue()`, `incrementRetryOrFail()`, and `markItemFailed()` blocks and the `sync` event listener from `service-worker.js`.

---

### 10. Edge Case: Offline Queue Replay When Already Online on Direct App Reopen (`useNetworkSync.js`)
- **Location:** `client/src/hooks/useNetworkSync.js`
- **Description:** `useNetworkSync.js` triggers `processOfflineQueue()` on mount and on the window `online` / `visibilitychange` events.
- **Edge Case Gap:** If a user creates writes offline, closes the tab/browser, reconnects to internet while the browser is closed, and reopens the app directly in an already-online state, the initial mount trigger runs, but any transient network timing before auth cookies re-hydrate may benefit from explicit session-ready gating.
- **Recommended Action:**
  - Add explicit sync trigger upon verified authentication session hydration (`authClient.useSession()`) in addition to initial component mount.

---

### 11. "Manage" / Edit Flow for Rejected Modules (`ModuleCard.jsx`)
- **Location:** `client/src/components/ui/modules/ModuleCard.jsx:L236-L245`
- **Description:** On administrative module cards, the primary action button (`Manage`) remains a stub displaying `title="Module management/editing is under development."` with a no-op click handler (`e.stopPropagation()`).
- **Architectural Reality:** When an MDRRMO Head Admin rejects a module with feedback remarks, the original authoring admin sees the rejection notice on their dashboard, but clicking "Manage" cannot open the builder wizard in edit mode populated with existing steps and curriculum data.
- **Recommended Action:**
  - Wire `Manage` button to trigger `handleOpenWizard(module)` or `navigate('/admin/mdrrmo/modules/builder?id=' + module.id)`.
  - Implement edit mode hydration in `useModuleBuilder` / `ModuleBuilderWizard` to pre-populate form headers, levels, and sequence flows from `GET /api/modules/:id`.

---

### 12. Strict Admin-Provisioning Hierarchy Enforcement
- **Location:** `client/src/pages/admin/system/users/components/provision/AdminRoleSelection.jsx`, `client/src/pages/admin/mdrrmo/user-management/components/RegisterPersonnelForm.jsx`, `server/controllers/admin/user-management/provisionAdmin.js`, `server/config/permissions.js`
- **Description:**
  - **Frontend:** `RegisterPersonnelForm.jsx` (MDRRMO admin view) hardcodes `<option value="barangay_admin">`, while `AdminRoleSelection.jsx` (System admin view) displays `mdrrmo_admin` and `barangay_admin`.
  - **Backend:** `provisionAdmin.js` validates only that the requested role is within `["barangay_admin", "mdrrmo_admin"]`. It does NOT validate whether the authenticated requester (`req.user.role`) possesses the hierarchical authority to provision that specific tier (e.g. `system_admin` $\to$ `head_mdrrmo_admin` $\to$ `mdrrmo_admin` $\to$ `barangay_admin`).
- **Architectural Impact:** Any account with `provision_admins` permission (which currently includes `mdrrmo_admin`) could send a direct API POST request with `{ role: "mdrrmo_admin" }` to provision a peer MDRRMO admin, bypassing horizontal privilege boundaries.
- **Recommended Action:**
  - Implement a server-side hierarchy matrix in `provisionAdmin.js` ensuring a creator can only provision roles strictly below their own rank.
  - Dynamically populate the frontend role options based on the authenticated admin's current role.

---

### 13. Local Announcements Priority System & Urgent Badging
- **Location:** `client/src/pages/admin/barangay/workspace/announcementModal.jsx`, `client/src/components/ui/announcements/AnnouncementCard.jsx`, `client/src/pages/admin/mdrrmo/LiveAlerts.jsx`, `server/controllers/admin/barangayController.js`
- **Description:** While basic localized announcement creation (`title`, `content`) exists for Barangay Admins, the priority categorization system (`Standard` vs `Urgent`), urgent advisory badge indicators on resident announcement cards, and MDRRMO/Municipal broadcast overrides remain unimplemented scaffolding (`LiveAlerts.jsx` displays *"The announcement broadcasting system is currently being developed."*).
- **Architectural Impact:** Critical emergency advisories cannot be visually differentiated from standard municipal announcements on resident feeds.
- **Recommended Action:**
  - Add `priority` column (`VARCHAR(20) DEFAULT 'standard'`) to `announcements` schema.
  - Add priority selection radio/dropdown in `announcementModal.jsx` and render a high-visibility `Urgent` badge on `AnnouncementCard.jsx`.

---

### 14. Progressive Web App (PWA) Manifest & Production Asset Precaching
- **Location:** `client/public/manifest.json`, `client/index.html`, `client/public/service-worker.js`, `client/vite.config.js`
- **Description:**
  - **Missing Web App Manifest:** No `manifest.json` or `manifest.webmanifest` exists in `client/public/`. The application lacks `theme_color`, `background_color`, `display: "standalone"`, `start_url`, and high-resolution PWA app icon definitions (`192x192`, `512x512`, `maskable`).
  - **Missing HTML Mobile & PWA Headers:** `index.html` lacks `<link rel="manifest">`, `<meta name="theme-color">`, and Apple touch icon tags (`<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable">`).
  - **Manual Service Worker vs. Vite Chunk Precaching:** `service-worker.js` manually hardcodes `urlsToCache = ["/", "/index.html"]`. It does not automatically precache hashed Vite build bundles (`dist/assets/*.js`, `dist/assets/*.css`), meaning full offline navigation to unvisited views fails unless previously visited.
  - **Missing Installation Hook:** No `beforeinstallprompt` event listener or custom in-app install prompt banner exists to encourage mobile/desktop installation.
- **Architectural Impact:** Mobile and desktop users cannot install the LMS as a standalone offline PWA application, and offline reliability is limited to previously cached network responses.
- **Recommended Action:**
  - Integrate `vite-plugin-pwa` in `client/vite.config.js` with auto-update service worker strategy and Workbox precaching for all production assets.
  - Generate canonical PWA icons (`icon-192.png`, `icon-512.png`, `icon-maskable.png`) and create `manifest.webmanifest`.
  - Add an in-app `InstallAppPrompt` component listening to the window `beforeinstallprompt` event.

---

### 15. Offline-Replay Duplicate Risk (Idempotency Keys)
- **Location:** `client/src/lib/LocalSave/syncManager.js`, `server/controllers/feedback/feedbackController.js`, `server/controllers/admin/barangayController.js`
- **Description:**
  - **Context:** The application is an offline-first PWA with a background sync queue (`syncManager.js` replaying queued writes via Dexie on reconnect). Any `POST` endpoint without a unique constraint is vulnerable to duplicate creation if the server processes a request successfully but the HTTP 200 OK never reaches the client before the connection drops — the client re-queues and replays the same write on the next reconnect.
  - **Confirmed Vulnerable (verified against real code):**
    - `POST /api/feedbacks` (`feedbackController.js`) — raw `INSERT INTO feedbacks`, no deduplication key or unique constraint.
    - Future: `POST /api/announcements` — same pattern, and this endpoint does not exist as a real feature yet (Item 13, deferred).
  - **Confirmed NOT Vulnerable (real UNIQUE constraints + ON CONFLICT verified):**
    - `user_step_progress` (`CONSTRAINT unique_user_step UNIQUE (user_id, step_id)` with `ON CONFLICT (user_id, step_id) DO NOTHING`).
    - `certificates` (`CONSTRAINT uq_certificates_user_module UNIQUE (user_id, module_id)` with `ON CONFLICT (user_id, module_id) DO NOTHING`).
    - `levels` / `module_steps` (`CONSTRAINT levels_mod_id_level_order_key UNIQUE (mod_id, level_order)` with `ON CONFLICT (mod_id, level_order) DO UPDATE`).
- **Recommended Action (not yet implemented):**
  - Client generates a UUID (`client_mutation_id`) when queuing a write in Dexie `sync_queue`, passed either via an `Idempotency-Key` request header or as a body/column value.
  - Server defines unique constraints on `client_mutation_id` and executes `ON CONFLICT (client_mutation_id) DO NOTHING` on all creation endpoints that interface with the offline sync queue.
- **Strategic Decision:** Bundle this enhancement with the Local Announcements build (Item 13) rather than fixing feedback in isolation now — no sense adding the idempotency plumbing to a feature that does not exist yet, and current feedback exposure is lower-frequency (requires the specific processed-but-response-lost race condition) than the Publish-button double-click case, which was fixed separately and immediately.



