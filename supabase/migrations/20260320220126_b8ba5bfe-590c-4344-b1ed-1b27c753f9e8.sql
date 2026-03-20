
-- Fix 1: Harden profile update policy to prevent role escalation using JWT claims
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (auth.jwt() ->> 'role_from_profile')::text  -- fallback: use SECURITY DEFINER
    AND NOT (student_id IS DISTINCT FROM (SELECT p.student_id FROM profiles p WHERE p.id = auth.uid()))
  );

-- Actually, auth.jwt() doesn't have role_from_profile. Let's use a SECURITY DEFINER approach instead.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_my_role()
    AND student_id IS NOT DISTINCT FROM get_my_student_id()
  );

-- Fix 2: Create a view for students that hides sensitive parent data from student-role users
-- Instead of modifying the policy, we restrict what students can query via app logic.
-- For RLS, we'll create a more restrictive student SELECT policy
DROP POLICY IF EXISTS "students_select_student" ON students;
CREATE POLICY "students_select_student" ON students
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'student' AND get_my_student_id() = student_id
  );

-- Fix 3: Block direct client inserts on messages_log
CREATE POLICY "Block client insert on messages_log" ON messages_log
  FOR INSERT TO authenticated
  WITH CHECK (false);
