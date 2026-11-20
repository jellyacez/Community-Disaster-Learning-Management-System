// Whether an unfinished enrollment belongs in "In Progress" lists (Enrolled Modules tab,
// dashboard Resume / Continue). Archived versions were replaced by a newer published one.
export const canResumeEnrollment = (mod) => mod.module_status !== "archived";
