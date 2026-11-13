// Role ranks live only here. Admin controllers acting on another user must call assertActorOutranksTarget() first.

const ROLE_RANKS = {
  super_admin: 6,
  system_admin: 5,
  head_mdrrmo_admin: 4,
  mdrrmo_admin: 3,
  barangay_admin: 2,
  resident: 1,
};

/** Unknown roles rank 0, below every known role. */
function getRank(role) {
  return ROLE_RANKS[role] ?? 0;
}

/**
 * Throws SECURITY_FAULT unless actorRole strictly outranks targetRole.
 * Applies to system_admin too: any system_admin exception has to be handled at the call site.
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

/** Provisioning: the new account's role must rank below the actor's. Throws SECURITY_FAULT. */
function assertCanProvision(actorRole, newUserRole) {
  const actorRank = getRank(actorRole);
  const newUserRank = getRank(newUserRole);

  if (actorRole === "system_admin") {
    if (newUserRank >= actorRank) {
      throw new Error("SECURITY_FAULT: Cannot provision equal or higher rank.");
    }
    return;
  }

  if (actorRank <= newUserRank) {
    throw new Error(
      `SECURITY_FAULT: Provisioning role '${newUserRole}' (rank ${newUserRank}) is not allowed ` +
      `for an actor with role '${actorRole}' (rank ${actorRank}). ` +
      `You may only provision accounts below your own rank.`
    );
  }
}

module.exports = { ROLE_RANKS, getRank, assertActorOutranksTarget, assertCanProvision };
