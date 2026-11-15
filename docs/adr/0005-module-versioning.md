# ADR 0005: Module versioning and archived versions

## Status
**Proposed: the intended rule and the current code disagree. Decision needed.**

## Date
Versioning added 2026-09-01 (commit `abcf2c3`); this record written 2026-11-15.

## Context
A published module is changed by creating a new version: a new `module_data` row whose `parent_mod_id` points at the published one. It goes through review like any module. When the new version is published, the parent is set to `archived` in the same transaction (`server/services/modules/ModuleService.js:858-869`). New enrollment requires `status = 'published'` (`isOpenToLearners`, `server/controllers/modules/moduleController.js:8-9`).

The intended rule, recorded in TECH_DEBT ("Input Validation Audit Findings", constraint H6), is:

> Archived modules stay readable/writable for residents with an existing `module_activity` row; only new enrollment requires `status = 'published'`.

## What the code does today (verified 2026-11-15 on a scratch database)
A resident was enrolled in a published module, then the module was archived exactly as publishing a new version does:

| Request | While published | After archive |
|---|---|---|
| `GET /api/modules/:id/viewer` | 200 | **404** (`moduleController.js:385-392` uses `isOpenToLearners`) |
| `POST /api/modules/:id/steps/:stepId/attempts` (final assessment) | allowed | **404** (`QuizAttemptService.js:210-213` requires `published`) |

Step progress (`ModuleProgressService`) checks only enrollment, so it still accepts writes, but the learner can't open the module or take its final assessment. So a learner partway through a module loses access to it when a new version is published.

## Options
1. **Follow the intended rule:** let enrolled learners keep using an archived version. Allow the viewer and attempts when the user has a `module_activity` row for that module, for any status other than draft or deleted.
2. **Move learners to the new version** when it's published, carrying progress over where steps match.
3. **Keep the current behaviour and document it:** publishing a new version ends access to the old one, and learners re-enroll in the new version.

## Decision
Not made. Option 1 matches the recorded rule and is the smallest code change. Choosing it means changing the two checks above, with a regression test for each.

## Consequences
Until this is decided, publishing a new version of a module in use blocks its enrolled learners from finishing it.
