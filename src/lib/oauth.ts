import { buildAppUrl } from "./siteUrl";

export function buildOAuthRedirectUrl(path = "/") {
  const next = path.startsWith("/") ? path : `/${path}`;
  return `${buildAppUrl("/auth/callback")}?next=${encodeURIComponent(next)}`;
}
