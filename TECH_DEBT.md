# Technical Debt

- **TanStack Query Cache Collisions**: Multiple components sharing a TanStack Query cache key with independent mapping logic in queryFn has caused two separate silent-data-corruption bugs. Prefer `select` for view-specific shaping (as now used for barangays) over shape-changing `queryFn`s, especially for any query key touched by more than one component.

### `BACOLOR_BARANGAYS` Static Admin Filters
- **Location:** `client/src/constants/locations.js` (used in `ResidentRegistry.jsx`, `BarangayFilters.jsx`, `UserFilters.jsx`)
- **Issue:** The admin dashboard filtering components still use a hardcoded string array to populate dropdowns, and send string names to the backend rather than `barangay_id`. The backend (`UserService.js`, called by `getResidents.js`) relies on a subquery (`SELECT id FROM barangays WHERE name = $1`) to map the string back to the ID. 
- **Risk:** High brittleness. If a barangay name in the database diverges from the hardcoded string by a single character (or if new ones are added), the filters silently break.
- **Why Deferred:** Requires a multi-layer refactor (wiring up `useBarangays` query in 3 frontend components, changing component state from strings to integers, and refactoring `UserService.js` and `getResidents.js` to filter by `barangay_id` directly). Given these are behind-auth admin filters, the risk of data corruption is low, but this should be unified with the Registration/Profile pattern (dynamic fetch + ID) in a future sweep. Note: `mdrrmoOverviewController.js` is already correctly using `barangay_id` for filtering, so it does not need to be refactored on the backend.
