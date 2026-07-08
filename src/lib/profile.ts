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
