import { describe, expect, it, vi } from "vitest";
import { buildAppUrl, getSiteUrl } from "./siteUrl";

describe("siteUrl helpers", () => {
  it("uses the configured site URL when provided", () => {
    vi.stubEnv("VITE_SITE_URL", "https://www.independentmindsedu.org");

    expect(getSiteUrl()).toBe("https://www.independentmindsedu.org");
  });

  it("builds absolute URLs for app routes", () => {
    expect(buildAppUrl("/reset-password")).toBe("https://www.independentmindsedu.org/reset-password");
  });
});
