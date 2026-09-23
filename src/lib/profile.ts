export function resolveProfileDisplayName(
  profileDisplayName?: string | null,
  userMetadata?: Record<string, unknown>,
  userEmail?: string | null,
  fallback = "User",
) {
  const metadataName =
    typeof userMetadata?.full_name === "string"
      ? userMetadata.full_name
      : typeof userMetadata?.name === "string"
        ? userMetadata.name
        : null;

  const resolved = profileDisplayName || metadataName || userEmail || fallback;
  return typeof resolved === "string" && resolved.trim() ? resolved.trim() : fallback;
}

// Priority when an account holds several user_roles rows. "parent" comes
// first because the app keys the parent experience (student list, isParent
// checks) off profile.role === "parent"; the rest follow in a fixed order
// because user_roles rows come back in no guaranteed order.
const PRIMARY_ROLE_PRIORITY = ["parent", "manager", "educator", "admin"];

/**
 * Picks the account's primary role from ALL of its user_roles rows.
 * "student" is returned only when the account has no other role (or none
 * at all) -- never as a side effect of having more than one role.
 */
export function resolvePrimaryRole(roles: ReadonlyArray<string | null | undefined>): string {
  const present = roles.filter((r): r is string => typeof r === "string" && r.length > 0);
  for (const role of PRIMARY_ROLE_PRIORITY) {
    if (present.includes(role)) return role;
  }
  return present.find((r) => r !== "student") ?? "student";
}
