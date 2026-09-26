// Minimum password length, matching the Supabase Auth setting (8). Checked in
// the client too so users get a clear message before the server rejects it.
export const MIN_PASSWORD_LENGTH = 8;

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
