import { describe, expect, it } from "vitest";
import { isRootOk, isWwwOk } from "./dnsExpected";

const A = (data: string) => ({ type: 1, data });
const CNAME = (data: string) => ({ type: 5, data });

describe("isRootOk", () => {
  it("accepts the current Vercel root A records", () => {
    expect(isRootOk([A("64.29.17.1"), A("216.198.79.1")])).toBe(true);
  });
  it("accepts other Vercel anycast IPs a different resolver may return", () => {
    expect(isRootOk([A("216.198.79.65"), A("64.29.17.65")])).toBe(true);
  });
  it("rejects a non-Vercel IP", () => {
    expect(isRootOk([A("1.2.3.4")])).toBe(false);
  });
  it("rejects the old Lovable IP, alone or mixed in", () => {
    expect(isRootOk([A("185.158.133.1")])).toBe(false);
    expect(isRootOk([A("216.198.79.1"), A("185.158.133.1")])).toBe(false);
  });
  it("rejects no records", () => {
    expect(isRootOk([])).toBe(false);
  });
});

describe("isWwwOk", () => {
  it("accepts the Vercel CNAME (with trailing dot) plus its IPs", () => {
    expect(isWwwOk([CNAME("7d9278614535e49d.vercel-dns-017.com."), A("216.198.79.65"), A("64.29.17.65")])).toBe(true);
  });
  it("rejects a CNAME to something else", () => {
    expect(isWwwOk([CNAME("old-host.example.com."), A("1.2.3.4")])).toBe(false);
  });
  it("accepts plain Vercel www A records and rejects the old IP", () => {
    expect(isWwwOk([A("216.198.79.65")])).toBe(true);
    expect(isWwwOk([A("185.158.133.1")])).toBe(false);
  });
});
