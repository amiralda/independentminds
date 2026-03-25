
-- Currency settings table for reward-to-currency conversion
CREATE TABLE public.currency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  currency_code text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  points_per_unit integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "currency_settings_select" ON public.currency_settings FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "currency_settings_insert" ON public.currency_settings FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent'::text) AND is_my_student(student_id));
CREATE POLICY "currency_settings_update" ON public.currency_settings FOR UPDATE TO authenticated USING ((get_my_role() = 'parent'::text) AND is_my_student(student_id));
CREATE POLICY "currency_settings_delete" ON public.currency_settings FOR DELETE TO authenticated USING ((get_my_role() = 'parent'::text) AND is_my_student(student_id));

CREATE TRIGGER update_currency_settings_updated_at BEFORE UPDATE ON public.currency_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Digital checks table for generated vouchers
CREATE TABLE public.digital_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  amount_points integer NOT NULL,
  currency_amount numeric(10,2) NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  check_number text NOT NULL,
  memo text,
  status text NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz
);

ALTER TABLE public.digital_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digital_checks_select" ON public.digital_checks FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "digital_checks_insert" ON public.digital_checks FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent'::text) AND is_my_student(student_id));
CREATE POLICY "digital_checks_update" ON public.digital_checks FOR UPDATE TO authenticated USING ((get_my_role() = 'parent'::text) AND is_my_student(student_id));

-- Storage bucket for AI tutor file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-uploads', 'ai-uploads', false);

CREATE POLICY "Students upload ai files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students read own ai files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students delete own ai files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
