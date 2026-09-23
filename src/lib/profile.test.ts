import { describe, expect, it } from "vitest";
import { resolveProfileDisplayName, resolvePrimaryRole } from "./profile";

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

describe("resolvePrimaryRole", () => {
  it("never falls back to student when the account has several roles", () => {
    expect(resolvePrimaryRole(["admin", "parent"])).toBe("parent");
    expect(resolvePrimaryRole(["parent", "admin"])).toBe("parent");
    expect(resolvePrimaryRole(["manager", "parent"])).toBe("parent");
    expect(resolvePrimaryRole(["student", "parent"])).toBe("parent");
  });

  it("keeps a single real role unchanged", () => {
    expect(resolvePrimaryRole(["parent"])).toBe("parent");
    expect(resolvePrimaryRole(["educator"])).toBe("educator");
    expect(resolvePrimaryRole(["admin"])).toBe("admin");
    expect(resolvePrimaryRole(["manager"])).toBe("manager");
  });

  it("picks the first non-student role in a fixed order when there is no parent role", () => {
    expect(resolvePrimaryRole(["admin", "manager"])).toBe("manager");
    expect(resolvePrimaryRole(["student", "admin"])).toBe("admin");
  });

  it("returns student only when that is genuinely all the account has", () => {
    expect(resolvePrimaryRole(["student"])).toBe("student");
    expect(resolvePrimaryRole([])).toBe("student");
    expect(resolvePrimaryRole([null, undefined, ""])).toBe("student");
  });
});
