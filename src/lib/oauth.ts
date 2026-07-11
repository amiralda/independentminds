const CANONICAL_SITE_URL = "https://www.independentmindsedu.org";

function getOAuthBaseUrl() {
  const configured =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_SITE_URL as string | undefined)?.trim()
      : undefined;

  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();

    // Prevent redirect allow-list mismatch when users open the apex domain.
    if (host === "independentmindsedu.org") {
      return CANONICAL_SITE_URL;
    }

    return window.location.origin;
  }

  return CANONICAL_SITE_URL;
}

export function buildOAuthRedirectUrl(path = "/") {
  const next = path.startsWith("/") ? path : `/${path}`;
  return `${getOAuthBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
