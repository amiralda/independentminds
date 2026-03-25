import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique student ID from first name + YYMM + random 5-digit sequence.
 * Format: XX2503-48271 (first 2 letters uppercase + year/month + dash + 5 random digits)
 *
 * If DOB is not provided, uses current date for YYMM.
 * Checks for existing IDs to avoid collisions.
 */
export async function generateStudentId(
  fullName: string,
  dob?: string,
): Promise<string> {
  const firstName = fullName.trim().split(/\s+/)[0] || 'ST';
  const prefix = firstName.substring(0, 2).toUpperCase();

  // Use DOB for YYMM if available, otherwise current date
  const dateRef = dob ? new Date(dob) : new Date();
  const yy = String(dateRef.getFullYear()).slice(-2);
  const mm = String(dateRef.getMonth() + 1).padStart(2, '0');
  const base = `${prefix}${yy}${mm}`;

  // Find existing IDs with same base to avoid collisions
  const { data: existing } = await supabase
    .from('students')
    .select('student_id')
    .ilike('student_id', `${base}-%`);

  const usedSeqs = new Set(
    (existing || []).map(row => {
      const parts = row.student_id.split('-');
      return parts[parts.length - 1];
    }),
  );

  // Generate random 5-digit sequence, retry on collision
  let seq: string;
  do {
    seq = String(Math.floor(10000 + Math.random() * 90000));
  } while (usedSeqs.has(seq));

  return `${base}-${seq}`;
}
