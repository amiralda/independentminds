
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "public_insert_beta_requests" ON public.beta_requests;

-- Replace with a policy that validates required fields
CREATE POLICY "public_insert_beta_requests" ON public.beta_requests
  FOR INSERT TO anon
  WITH CHECK (
    name IS NOT NULL AND name <> '' AND
    email IS NOT NULL AND email <> '' AND
    tester_type IS NOT NULL AND tester_type <> '' AND
    status = 'pending' AND
    reviewed_by IS NULL AND
    reviewed_at IS NULL
  );
