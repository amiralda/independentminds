import { describe, expect, it } from "vitest";
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH } from "./password";

describe("isPasswordLongEnough", () => {
  it("matches the Supabase Auth minimum of 8", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it("rejects 7 characters and accepts 8", () => {
    expect(isPasswordLongEnough("Ab1!xyz")).toBe(false);
    expect(isPasswordLongEnough("Ab1!xyzw")).toBe(true);
  });
});
