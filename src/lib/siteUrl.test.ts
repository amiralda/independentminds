import { describe, expect, it, vi } from "vitest";
import { buildAppUrl, getSiteUrl } from "./siteUrl";

describe("siteUrl helpers", () => {
  it("uses the configured site URL when provided", () => {
    vi.stubEnv("VITE_SITE_URL", "https://independentminds.org");

    expect(getSiteUrl()).toBe("https://independentminds.org");
  });

  it("builds absolute URLs for app routes", () => {
    expect(buildAppUrl("/reset-password")).toBe("https://independentminds.org/reset-password");
  });
});
