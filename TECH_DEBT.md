# Technical Debt & Architecture Log

This document tracks identified technical debt, architectural decisions, and resolution history for the Bacolor Community Disaster Learning Management System.

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
- **Resolution:** All three components migrated to import `BARANGAY_LIST` from `client/src/constants/barangays.js` (the canonical `{id, name}` object array). `option` keys now use `b.id` and `value` continues to use `b.name` (matching the existing backend string-match logic, which has not changed). `locations.js` is now fully orphaned with zero imports — safe to delete in a future cleanup pass.
- **Note:** The deeper backend refactor (passing `barangay_id` integer directly instead of a name string) was not pursued — the backend `UserService.js` subquery approach still works and the risk of name drift is eliminated on the frontend since `BARANGAY_LIST` and the `barangays` DB table are kept in sync.

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

## 🟡 Open / Active Technical Debt Items

### 1. Sequence Canvas Flow Configuration Stub (`SequenceCanvas.jsx`)
- **Location:** `client/src/pages/admin/mdrrmo/module-management/builders/SequenceCanvas.jsx:L76-L81`
- **Description:** A "Set By" `<select>` element containing options `Sequential` and `Optional` is present in the builder canvas header. It is currently unmanaged (no `value` prop, no `onChange` handler, and not part of the module form payload).
- **Architectural Reality:** The PostgreSQL schema enforces a strictly linear progression model:
  ```sql
  CONSTRAINT module_steps_level_id_step_order_key UNIQUE (level_id, step_order);
  ```
  Both `ModuleProgressService.js` and `ModuleViewer.jsx` compute progress strictly linearly ($1 \to 2 \to 3$). There is no schema support for conditional or optional branching.
- **Recommended Action:** Pending explicit scope decision:
  - If branching is desired in a future milestone: expand the database schema (`is_optional`, `flow_type`) and rewrite `ModuleProgressService`.
  - If progression remains strictly linear: replace the `<select>` with a decorative status badge (`Flow: Sequential`) or remove it to avoid user confusion.

---

### 2. Module Editing Capability (Intentionally Deferred)
- **Location:** `client/src/pages/admin/mdrrmo/module-management/builders/ModuleBuilderWizard.jsx`, `client/src/hooks/useModuleBuilder.js`
- **Description:** The frontend wizard contains scaffolding for `editingModuleId`, but full module editing (hydrating existing level/step sequences, updating existing assessments, and diffing DB rows) is not yet implemented.
- **Status:** Explicitly excluded from current sprint per development roadmap. When scheduled, will require a dedicated `PUT /api/modules/:id` endpoint and step reconciliation logic.

---

### 3. Orphaned File: `client/src/constants/locations.js`
- **Location:** `client/src/constants/locations.js`
- **Description:** All admin filter components have been migrated to the canonical `BARANGAY_LIST` in `barangays.js`. `locations.js` has zero active imports in the repository.
- **Recommended Action:** Safe to delete in a subsequent dead-code cleanup pass.

---

### 4. Large Production Bundle Chunks & Code Splitting
- **Location:** `client/src/` build output
- **Description:** Vite build output warns that chunks exceed 500 kB:
  - `dist/assets/certTemplate-*.js` (~1.43 MB): Includes PDF rendering, canvas utilities, and embedded assets.
  - `dist/assets/ModuleManagement-*.js` (~470 kB): Includes TipTap rich text suite, drag-and-drop canvas, and SVG icons.
- **Recommended Action:** Implement React dynamic imports (`React.lazy()` / `import()`) for `certTemplate`, `AdminFeedbackManager`, and `ModuleBuilderWizard` to optimize initial client bundle size and Time-to-Interactive (TTI).

---

### 5. Offline Queue Retry Strategy & Notification Bounds
- **Location:** `client/src/lib/LocalSave/syncManager.js`, `client/src/hooks/useNetworkSync.js`
- **Description:** When `processOfflineQueue()` encounters an error, it increments `retry_count`.
- **Recommended Action:** For long-term production resilience, consider implementing exponential backoff intervals for failed retries and a maximum retry cap with user-facing notification if an offline sync permanently fails (e.g. server validation rejection).

---

### 6. Certificate Revocation Authority — MDRRMO Override Not Yet Implemented
- **Current state:** Only `barangay_admin` can revoke certificates, correctly scoped to their own barangay (verified working).
- **Gap:** Original feature spec describes MDRRMO as having 'ultimate verification authority' to revoke any certificate municipality-wide — this was never built. No revoke action exists in the MDRRMO dashboard (Phase 3 is read-only/analytics).
- **Decided direction (not yet implemented):** MDRRMO-tier admins should be able to revoke any certificate, with the affected barangay's admin(s) notified afterward (via the existing in-app notification bell and/or the existing nodemailer pipeline — mechanism TBD). Still needs: which MDRRMO tiers get this power (all three, or just `mdrrmo_admin` + `head_mdrrmo_admin`), and confirmation of whether a barangay can have multiple assigned admins (notification must reach all of them if so).
- **Revisit:** After Phase 4/5 wrap, before final handover.

