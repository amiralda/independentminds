import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique student ID from first name + YYMM + sequence.
 * Format: XX2503-01 (first 2 letters uppercase + year/month + dash + sequence)
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

  // Find existing IDs with same base to determine next sequence
  const { data: existing } = await supabase
    .from('students')
    .select('student_id')
    .ilike('student_id', `${base}-%`);

  const usedSeqs = (existing || []).map(row => {
    const parts = row.student_id.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  });

  const nextSeq = usedSeqs.length > 0 ? Math.max(...usedSeqs) + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return `${base}-${seqStr}`;
}
