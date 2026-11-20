# ADR 0005: Module versioning and archived versions

## Status
Accepted (2026-11-20)

## Date
Versioning added 2026-09-01 (`abcf2c3`). Rule decided and implemented 2026-11-20 (branch `fix/archived-version-access`).

## Context
A published module is changed by creating a new version: a new `module_data` row whose `parent_mod_id` points at the published one. It goes through review like any module. When the new version is published, the parent is set to `archived` in the same transaction (`server/services/modules/ModuleService.js:858-869`).

`ec54ad7` (2026-10-22) blocked learners from every module that wasn't `published`, and `3fbb442` (2026-10-23) did the same for the final assessment. As a result, publishing a new version cut enrolled learners off from the version they were on: the viewer, the syllabus and the final assessment all returned 404. `39d8608` (2026-10-24) then made the module card send them to the new version instead. This contradicted the rule recorded in TECH_DEBT (H6).

## Decision
- **New enrollment** (enroll, enrollment-code request) requires `status = 'published'` and `moddateremove IS NULL`.
- **A learner with a `module_activity` row for a version keeps full access to it after it is archived:** details, viewer, step completion, final-assessment attempts and certificate issuance.
- **Learners without an enrollment row get 404** for any module that isn't published.
- **Drafts, pending and rejected modules are never visible to learners**, even with a stray enrollment row. Removed modules (`moddateremove` set) are hidden as well.
- **Admin access is unchanged.**

One helper, `ModuleService.canLearnerAccessModule(userId, modId)`, encodes the access rule. It is used by the learner guards on `GET /api/modules/:id/details`, `GET /api/modules/:id/viewer` and the final-assessment start (`QuizAttemptService.startOrResume`). Enroll (`moduleController.js:221`) and code requests (`ModuleService.requestModuleCode`) keep the stricter published-only check. Step completion and certificate issuance never checked status, so they need no change. The module card opens the learner's own version again, and the "Newer version available" chip links to the update.

## Alternatives considered
The rule was decided without recording reasons against these. Their trade-offs:
- **Move learners to the new version when it's published**, carrying progress over where steps match. Everyone is on current content, but steps don't map one-to-one between versions, so progress transfer is approximate.
- **Keep the old behaviour** (publishing ends access; learners re-enroll in the new version). The simplest option, but learners lose work they had started.

## Consequences
- **Two versions at once:** a learner can be on an old version while new learners take the new one. Certificates name the version the learner completed.
- **Tests:** `server/tests/archived-version-access.regression.cjs` covers the rule: enrolled in progress, enrolled completed, not enrolled, draft/pending, published unchanged. A browser check on a scratch database opened both an in-progress and a completed archived version from Enrolled Modules.
- **Follow-ups (not decided):**
  - The dashboard and the Enrolled Modules "In Progress" tab still leave out unfinished archived versions (`client/src/pages/user/enrolled-modules/EnrolledModules.jsx:21-22`, `client/src/pages/user/dashboard/Dashboard.jsx:214`).
  - The dashboard query hides an archived version with no progress when a newer version exists (`server/services/users/DashboardService.js`).
  - `GET /api/modules/steps/:stepId/assessment` checks neither status nor enrollment.
