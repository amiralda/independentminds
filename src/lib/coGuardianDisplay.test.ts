import { describe, it, expect } from "vitest";
import { initials, secondaryName } from "./coGuardianDisplay";

describe("secondaryName", () => {
  it("hides a display name derived from the email local part", () => {
    expect(secondaryName("julnadoraugustin@gmail.com", "julnadoraugustin")).toBeNull();
  });

  it("ignores case and surrounding spaces when comparing", () => {
    expect(secondaryName("Jane.Doe@x.com", "  jane.doe ")).toBeNull();
  });

  it("hides a display name equal to the full email", () => {
    expect(secondaryName("jane@x.com", "JANE@x.com")).toBeNull();
  });

  it("returns a real name that differs from the email", () => {
    expect(secondaryName("jdoe@x.com", "Jane Doe")).toBe("Jane Doe");
  });

  it("returns null for a missing or blank name", () => {
    expect(secondaryName("jane@x.com", null)).toBeNull();
    expect(secondaryName("jane@x.com", undefined)).toBeNull();
    expect(secondaryName("jane@x.com", "   ")).toBeNull();
  });

  it("keeps the name when the email is missing", () => {
    expect(secondaryName(null, "Jane Doe")).toBe("Jane Doe");
  });
});

describe("initials", () => {
  it("uses the first letter of the email when the name is derived from it", () => {
    expect(initials("julnadoraugustin@gmail.com", "julnadoraugustin")).toBe("J");
  });

  it("uses first and last word of a real name", () => {
    expect(initials("jdoe@x.com", "jane marie doe")).toBe("JD");
  });

  it("uses one letter for a single-word name", () => {
    expect(initials("jdoe@x.com", "Grandma")).toBe("G");
  });

  it("handles non-latin names", () => {
    expect(initials("x@y.com", "Ζωή Παπαδοπούλου")).toBe("ΖΠ");
  });

  it("falls back to ? with no email and no name", () => {
    expect(initials(null, null)).toBe("?");
    expect(initials("", "")).toBe("?");
  });
});
