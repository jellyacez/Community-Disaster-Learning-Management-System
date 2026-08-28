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

