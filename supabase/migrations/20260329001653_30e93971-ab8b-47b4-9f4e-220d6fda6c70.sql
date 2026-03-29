
-- Allow anyone (anon + authenticated) to read beta_config phase
CREATE POLICY "public_read_beta_config" ON public.beta_config
  FOR SELECT TO anon, authenticated
  USING (true);
