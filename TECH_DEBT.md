# Technical Debt

- **TanStack Query Cache Collisions**: Multiple components sharing a TanStack Query cache key with independent mapping logic in queryFn has caused two separate silent-data-corruption bugs. Prefer `select` for view-specific shaping (as now used for barangays) over shape-changing `queryFn`s, especially for any query key touched by more than one component.

### `BACOLOR_BARANGAYS` Static Admin Filters

- **Location:** `client/src/constants/locations.js` (used in `ResidentRegistry.jsx`, `BarangayFilters.jsx`, `UserFilters.jsx`)
- **Issue:** The admin dashboard filtering components still use a hardcoded string array to populate dropdowns, and send string names to the backend rather than `barangay_id`. The backend (`UserService.js`, called by `getResidents.js`) relies on a subquery (`SELECT id FROM barangays WHERE name = $1`) to map the string back to the ID.
- **Risk:** High brittleness. If a barangay name in the database diverges from the hardcoded string by a single character (or if new ones are added), the filters silently break.
- **Why Deferred:** Requires a multi-layer refactor (wiring up `useBarangays` query in 3 frontend components, changing component state from strings to integers, and refactoring `UserService.js` and `getResidents.js` to filter by `barangay_id` directly). Given these are behind-auth admin filters, the risk of data corruption is low, but this should be unified with the Registration/Profile pattern (dynamic fetch + ID) in a future sweep. Note: `mdrrmoOverviewController.js` is already correctly using `barangay_id` for filtering, so it does not need to be refactored on the backend.

### Resolved Security Findings: Cross-Session SPA Cache Persistence

- **Issue:** Due to the nature of SPA routing (`navigate`), explicit client-side logouts did not trigger a hard browser refresh, meaning the TanStack `queryClient` persisted in the browser's heap memory across authentication boundaries. If User A logged out and User B logged in without a hard refresh, User B was served User A's cached data (e.g., certificates, dashboard metrics, admin lists) before background refetches fired.
- **Root Cause:**
  1. `UserCertificates.jsx` was pointed to a typo'd, orphaned key (`["userDashboardData"]`), bypassing targeted key invalidations entirely.
  2. Architectural failure to execute `queryClient.clear()` on logout.
- **Resolution:**
  - Synchronous `queryClient.cancelQueries()` and `queryClient.clear()` wired into all seven confirmed session-exit points: `UserSidebar.jsx`, `AdminSidebar.jsx`, `useDangerZone.js`, `useSystemAdmin.js`, `AdminMfaSetupPage.jsx`, `MaintenancePage.jsx`, `ActiveDevices.jsx`.
  - Standardized `UserCertificates.jsx` to use `["userDashboard"]`.
  - **Note:** 401 Unauthorized responses and session expiries naturally mitigated this via `window.location.href = '/signin'`, which forces a hard refresh and destroys the memory cache. The vulnerability was localized entirely to manual, successful `authClient.signOut()` triggers.
- **Verification:** Manually confirmed clean across four scenarios: resident-to-resident account switch, admin-to-admin account switch, in-flight request race (throttled network, logout mid-fetch), and remote session revocation via `ActiveDevices`. No stale or cross-user data observed in any case.

### `AdminFeedbackManager.jsx` Missing Data Grid Features

- **Location:** `client/src/pages/admin/feedback/AdminFeedbackManager.jsx`
- **Issue:** The ticket queue maps directly over the array of feedbacks with no client-side or server-side search, sort, or pagination.
- **Why Deferred:** The current ticket volume is very low (e.g., 1 ticket), so this is not a blocking issue. However, once ticket volume grows, it will need to be refactored to support proper pagination and sorting (preferably server-side).
