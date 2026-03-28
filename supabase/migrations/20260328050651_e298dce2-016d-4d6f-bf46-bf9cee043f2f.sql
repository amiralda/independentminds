DROP POLICY "check_ins_delete" ON public.check_ins;

CREATE POLICY "check_ins_delete" ON public.check_ins
  FOR DELETE TO authenticated
  USING (
    get_my_role() = 'parent'
    AND is_my_student(student_id)
  );