/**
 * Canonical role rank table and hierarchy enforcement helpers.
 *
 * All admin controllers that act on a target user MUST call
 * assertActorOutranksTarget() before executing any privileged mutation.
 * This is the single source of truth for role ordering — never duplicate
 * rank constants in individual controllers.
 */

const ROLE_RANKS = {
  system_admin: 5,
  head_mdrrmo_admin: 4,
  mdrrmo_admin: 3,
  barangay_admin: 2,
  resident: 1,
};

/**
 * Returns the numeric rank for a role string. Unknown roles resolve to 0,
 * so they are always considered lower than any known role.
 *
 * @param {string} role
 * @returns {number}
 */
function getRank(role) {
  return ROLE_RANKS[role] ?? 0;
}

/**
 * Throws a SECURITY_FAULT error if the actor's role does NOT strictly
 * outrank the target's role (actorRank > targetRank).
 *
 * system_admin is still subject to this check — they cannot act on
 * other system_admins via this helper. Any bypass for system_admin
 * (e.g. demoting themselves or deleting) must be handled explicitly
 * at the call site with an additional guard.
 *
 * @param {string} actorRole   - Role of the admin performing the action
 * @param {string} targetRole  - Current role of the user being acted on
 * @throws {Error} SECURITY_FAULT if the actor does not outrank the target
 */
function assertActorOutranksTarget(actorRole, targetRole) {
  const actorRank = getRank(actorRole);
  const targetRank = getRank(targetRole);

  if (actorRank <= targetRank) {
    throw new Error(
      `SECURITY_FAULT: Cannot perform this action on a user with equal or higher role rank. ` +
      `Actor: ${actorRole} (rank ${actorRank}), Target: ${targetRole} (rank ${targetRank}).`
    );
  }
}

/**
 * For provisioning only: the actor must be exactly ONE tier above the
 * role being created (system_admin→head_mdrrmo_admin, head→mdrrmo_admin,
 * mdrrmo_admin→barangay_admin). Peer provisioning is not allowed even
 * though the requesting actor already passes requirePermission().
 *
 * @param {string} actorRole     - Role of the provisioning admin
 * @param {string} newUserRole   - Role requested for the new account
 * @throws {Error} SECURITY_FAULT if the actor is not exactly one tier above
 */
function assertCanProvision(actorRole, newUserRole) {
  const actorRank = getRank(actorRole);
  const newUserRank = getRank(newUserRole);

  // System admin can provision any role below system admin
  if (actorRole === "system_admin") {
    if (newUserRank >= actorRank) {
      throw new Error("SECURITY_FAULT: Cannot provision equal or higher rank.");
    }
    return;
  }

  // Other administrative roles can only provision roles lower than their own
  if (actorRank <= newUserRank) {
    throw new Error(
      `SECURITY_FAULT: Provisioning role '${newUserRole}' (rank ${newUserRank}) is not allowed ` +
      `for an actor with role '${actorRole}' (rank ${actorRank}). ` +
      `You may only provision accounts below your own rank.`
    );
  }
}

module.exports = { ROLE_RANKS, getRank, assertActorOutranksTarget, assertCanProvision };
