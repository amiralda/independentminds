import { describe, expect, it } from "vitest";
import { getDeploymentEnvStatus, isDeploymentHealthy } from "./env";

describe("deployment env helper", () => {
  it("returns healthy when all required vars are present", () => {
    const env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "anon-key",
      VITE_SUPABASE_PROJECT_ID: "proj-123",
      VITE_SITE_URL: "https://example.com",
    };

    expect(isDeploymentHealthy(env)).toBe(true);
    expect(getDeploymentEnvStatus(env).every((item) => item.ok)).toBe(true);
  });

  it("flags missing or invalid values", () => {
    const env = {
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
      VITE_SUPABASE_PROJECT_ID: "",
      VITE_SITE_URL: "not-a-url",
    };

    const statuses = getDeploymentEnvStatus(env);

    expect(statuses.find((item) => item.key === "VITE_SUPABASE_URL")?.ok).toBe(false);
    expect(statuses.find((item) => item.key === "VITE_SUPABASE_PUBLISHABLE_KEY")?.ok).toBe(false);
    expect(statuses.find((item) => item.key === "VITE_SUPABASE_PROJECT_ID")?.ok).toBe(false);
    expect(statuses.find((item) => item.key === "VITE_SITE_URL")?.ok).toBe(false);
    expect(isDeploymentHealthy(env)).toBe(false);
  });
});
