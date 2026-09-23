import { describe, expect, it } from "vitest";
import { ASSIGNABLE_PLAN_KEYS, PLAN_BY_KEY, PLANS, planIncludes } from "./plans";

describe("plans config", () => {
  it("super_pro includes every lower tier", () => {
    for (const key of ASSIGNABLE_PLAN_KEYS) {
      expect(planIncludes("super_pro", key)).toBe(true);
    }
  });

  it("pro does not include super_pro", () => {
    expect(planIncludes("pro", "pro")).toBe(true);
    expect(planIncludes("pro", "super_pro")).toBe(false);
  });

  it("unknown or missing plan_key ranks as basic", () => {
    expect(planIncludes("gold", "basic")).toBe(true);
    expect(planIncludes("gold", "plus")).toBe(false);
    expect(planIncludes(null, "plus")).toBe(false);
  });

  it("every assignable key has a display config", () => {
    for (const key of ASSIGNABLE_PLAN_KEYS) {
      expect(PLAN_BY_KEY[key]?.name).toBeTruthy();
    }
  });

  it("super_pro is not sold on the Pricing page", () => {
    expect(PLANS.map((p) => p.key)).not.toContain("super_pro");
  });
});
