// Whether an unfinished enrollment belongs in "In Progress" lists (Enrolled Modules tab,
// dashboard Resume / Continue). Archived versions were replaced by a newer published one;
// learners keep access to theirs (ADR 0005), so one they have started stays in progress.
// The dashboard query already hides archived versions at 0% that have a newer version.
export const canResumeEnrollment = (mod) => mod.module_status !== "archived" || Number(mod.progress) > 0;
