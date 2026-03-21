-- Add unique constraint on co_guardians for upsert support
ALTER TABLE public.co_guardians
  ADD CONSTRAINT co_guardians_student_guardian_unique
  UNIQUE (student_id, guardian_id);

-- Add RLS policy so co-guardians can SELECT students they're assigned to
CREATE POLICY "co_guardian_reads_students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.co_guardians
      WHERE co_guardians.student_id = students.student_id
        AND co_guardians.guardian_id = auth.uid()
    )
  );