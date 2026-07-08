import { describe, expect, it, vi } from "vitest";
import { buildOAuthRedirectUrl } from "./oauth";

describe("oauth redirect helper", () => {
  it("builds a callback URL that preserves the post-login destination", () => {
    vi.stubEnv("VITE_SITE_URL", "https://independentmindsedu.org");

    expect(buildOAuthRedirectUrl("/dashboard")).toBe(
      "https://independentmindsedu.org/auth/callback?next=%2Fdashboard"
    );
  });
});
