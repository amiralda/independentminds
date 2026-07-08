import { describe, expect, it } from "vitest";
import { resolveProfileDisplayName } from "./profile";

describe("resolveProfileDisplayName", () => {
  it("prefers the stored profile name over metadata and email", () => {
    expect(resolveProfileDisplayName("Ada", { full_name: "Grace" }, "ada@example.com")).toBe("Ada");
  });

  it("falls back to Google metadata when profile name is missing", () => {
    expect(resolveProfileDisplayName(null, { full_name: "Grace Hopper" }, "ada@example.com")).toBe("Grace Hopper");
  });

  it("uses a safe fallback when everything is missing", () => {
    expect(resolveProfileDisplayName(null, {}, null)).toBe("User");
  });
});
