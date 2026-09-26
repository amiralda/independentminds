// Expected DNS for the production domain, hosted on Vercel (verified live on
// 2026-09-26). The root domain uses Vercel's A records; www is a CNAME to the
// project's Vercel DNS target, which resolves to Vercel's www IPs. Update here
// only -- the DNS status panel and the setup wizard both read this module.
// (supabase/functions/dns-monitor keeps its own copy: edge functions can't
// import from src/.)

export const VERCEL_ROOT_A = ["216.198.79.1", "64.29.17.1"];
export const VERCEL_WWW_CNAME = "7d9278614535e49d.vercel-dns-017.com";
export const VERCEL_WWW_A = ["216.198.79.65", "64.29.17.65"];

// DoH answer record types.
const TYPE_A = 1;
const TYPE_CNAME = 5;

export interface DnsAnswer {
  type: number;
  data: string;
}

const stripDot = (v: string) => v.replace(/\.$/, "").toLowerCase();

export function aValues(answers: DnsAnswer[]): string[] {
  return answers.filter((a) => a.type === TYPE_A).map((a) => a.data);
}

/** Root is OK when it has A records and every one of them is a Vercel root IP. */
export function isRootOk(answers: DnsAnswer[]): boolean {
  const ips = aValues(answers);
  return ips.length > 0 && ips.every((ip) => VERCEL_ROOT_A.includes(ip));
}

/**
 * www is OK when it is a CNAME to the Vercel target (the A lookup returns the
 * CNAME plus Vercel's IPs), or, without a CNAME, when every A is a Vercel www IP.
 */
export function isWwwOk(answers: DnsAnswer[]): boolean {
  const cname = answers.find((a) => a.type === TYPE_CNAME);
  if (cname) return stripDot(cname.data) === VERCEL_WWW_CNAME;
  const ips = aValues(answers);
  return ips.length > 0 && ips.every((ip) => VERCEL_WWW_A.includes(ip));
}
