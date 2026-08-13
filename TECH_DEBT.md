# Technical Debt

### Resolved: TanStack Query Cache Collisions

- **Issue:** Multiple components sharing a TanStack Query cache key with independent mapping logic in `queryFn` caused two separate silent-data-corruption bugs.
- **Resolution:** All `"adminModules"` consumers now use properly namespaced sub-keys (`["adminModules", "management"]`, `["adminModules", "activeSyllabus"]`, `["adminModules", "overview"]`). `AdminApprovalModule` intentionally invalidates the root `["adminModules"]` key as a broadcast, which is correct. No remaining broad-key collisions exist in the codebase. Prefer `select` for view-specific shaping over shape-changing `queryFn`s for any key touched by more than one component.

---

### Resolved: `BACOLOR_BARANGAYS` Static Admin Filters

- **Previous location:** `client/src/constants/locations.js` (used in `ResidentRegistry.jsx`, `BarangayFilters.jsx`, `UserFilters.jsx`)
- **Issue:** Admin filtering components used a hardcoded flat string array. The backend mapped string names back to IDs via a subquery (`SELECT id FROM barangays WHERE name = $1`), creating brittleness if barangay names drifted.
- **Resolution:** All three components migrated to import `BARANGAY_LIST` from `client/src/constants/barangays.js` (the canonical `{id, name}` object array). `option` keys now use `b.id` and `value` continues to use `b.name` (matching the existing backend string-match logic, which has not changed). `locations.js` is now fully orphaned with zero imports — safe to delete in a future cleanup pass.
- **Note:** The deeper backend refactor (passing `barangay_id` integer directly instead of a name string) was not pursued — the backend `UserService.js` subquery approach still works and the risk of name drift is now eliminated on the frontend since `BARANGAY_LIST` and the `barangays` DB table are kept in sync.

---

### Resolved: Cross-Session SPA Cache Persistence

- **Issue:** Due to the nature of SPA routing (`navigate`), explicit client-side logouts did not trigger a hard browser refresh, meaning the TanStack `queryClient` persisted in the browser's heap memory across authentication boundaries. If User A logged out and User B logged in without a hard refresh, User B was served User A's cached data (e.g., certificates, dashboard metrics, admin lists) before background refetches fired.
- **Root Cause:**
  1. `UserCertificates.jsx` was pointed to a typo'd, orphaned key (`["userDashboardData"]`), bypassing targeted key invalidations entirely.
  2. Architectural failure to execute `queryClient.clear()` on logout.
- **Resolution:**
  - Synchronous `queryClient.cancelQueries()` and `queryClient.clear()` wired into all seven confirmed session-exit points: `UserSidebar.jsx`, `AdminSidebar.jsx`, `useDangerZone.js`, `useSystemAdmin.js`, `AdminMfaSetupPage.jsx`, `MaintenancePage.jsx`, `ActiveDevices.jsx`.
  - Standardized `UserCertificates.jsx` to use `["userDashboard"]`.
  - **Note:** 401 Unauthorized responses and session expiries naturally mitigated this via `window.location.href = '/signin'`, which forces a hard refresh and destroys the memory cache. The vulnerability was localized entirely to manual, successful `authClient.signOut()` triggers.
- **Verification:** Manually confirmed clean across four scenarios: resident-to-resident account switch, admin-to-admin account switch, in-flight request race (throttled network, logout mid-fetch), and remote session revocation via `ActiveDevices`. No stale or cross-user data observed in any case.

---

### Open: `AdminFeedbackManager.jsx` Missing Data Grid Features

- **Location:** `client/src/pages/admin/feedback/AdminFeedbackManager.jsx`
- **Issue:** The ticket queue maps directly over the array of feedbacks with no client-side or server-side search, sort, or pagination.
- **Why Deferred:** The current ticket volume is very low, so this is not a blocking issue. However, once ticket volume grows, it will need to be refactored to support proper pagination and sorting (preferably server-side).

---

### Resolved: Dead Columns in `feedbacks` Table

- **Location:** `public.feedbacks` table.
- **Issue:** The columns `reply`, `replied_by`, and `replied_at` were dead and fully stale. The feedback system was migrated to a threaded architecture (`feedback_messages` child table).
- **Resolution:** Dropped via `server/migrations/04_drop_dead_feedback_columns.sql`. Verified no active column references in `controllers/`, `services/`, or `routes/` before dropping — all `reply` hits in application code were confirmed to be `req.body.reply` (message text routed to `feedback_messages`), not column reads/writes on `feedbacks`.
