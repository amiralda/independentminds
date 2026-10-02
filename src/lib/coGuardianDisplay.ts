// Display helpers for co-guardian cards. Email is the primary label; the
// profile display_name is often derived from the email (e.g. "jane" for
// jane@x.com), so it is only shown when it adds real information.

const norm = (s: string) => s.trim().toLowerCase();

const localPart = (email: string | null | undefined) => (email ? email.split("@")[0] : "");

/** Returns the display name only when it differs from the email's local part; otherwise null. */
export function secondaryName(email: string | null | undefined, displayName: string | null | undefined): string | null {
  const name = (displayName ?? "").trim();
  if (!name) return null;
  const local = localPart(email);
  if (local && norm(name) === norm(local)) return null;
  if (email && norm(name) === norm(email)) return null;
  return name;
}

/** One or two uppercase initials: from a real name if there is one, else from the email. */
export function initials(email: string | null | undefined, displayName: string | null | undefined): string {
  const name = secondaryName(email, displayName);
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
    return letters.map((w) => Array.from(w)[0]).join("").toUpperCase();
  }
  const first = Array.from(localPart(email).trim())[0];
  return first ? first.toUpperCase() : "?";
}
