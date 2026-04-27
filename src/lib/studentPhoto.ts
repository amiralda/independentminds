import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a value stored in `students.profile_photo_url` to a usable image URL.
 *
 * The `student-photos` bucket is private, so we must request a short-lived signed URL.
 * For backward-compat, accepts either a storage path (e.g. "STU001/avatar.jpg") or
 * a legacy public URL (which it parses to extract the path).
 */
export async function resolveStudentPhotoUrl(
  pathOrUrl: string | null | undefined,
  expiresInSeconds = 60 * 60 // 1 hour
): Promise<string | null> {
  if (!pathOrUrl) return null;

  let storagePath = pathOrUrl;

  // If it looks like a full URL, try to extract the storage path
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const marker = "/student-photos/";
    const idx = pathOrUrl.indexOf(marker);
    if (idx === -1) return null; // unknown URL, can't sign
    storagePath = pathOrUrl.slice(idx + marker.length).split("?")[0];
  }

  const { data, error } = await supabase.storage
    .from("student-photos")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
