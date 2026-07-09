const DEFAULT_SITE_URL = "https://independentminds.org";

export function getSiteUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL as string;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin) {
      return origin;
    }
  }

  return DEFAULT_SITE_URL;
}

export function buildAppUrl(path: string): string {
  const base = getSiteUrl();
  if (!path) return base;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
