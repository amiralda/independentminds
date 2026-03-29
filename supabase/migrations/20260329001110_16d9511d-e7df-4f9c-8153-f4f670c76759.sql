
-- Add referral_code to beta_testers (unique code for sharing)
ALTER TABLE public.beta_testers 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT encode(extensions.gen_random_bytes(8), 'hex');

-- Add referred_by to beta_requests (tracks who referred this request)
ALTER TABLE public.beta_requests 
ADD COLUMN IF NOT EXISTS referred_by_code text;

-- Create beta_referrals table to track referral rewards
CREATE TABLE IF NOT EXISTS public.beta_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_tester_id uuid NOT NULL REFERENCES public.beta_testers(id) ON DELETE CASCADE,
  referred_request_id uuid REFERENCES public.beta_requests(id) ON DELETE SET NULL,
  referred_tester_id uuid REFERENCES public.beta_testers(id) ON DELETE SET NULL,
  points_awarded integer NOT NULL DEFAULT 50,
  awarded_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_referrals ENABLE ROW LEVEL SECURITY;

-- Admin can see all referrals
CREATE POLICY "admin_select_referrals" ON public.beta_referrals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Testers can see their own referrals
CREATE POLICY "tester_select_own_referrals" ON public.beta_referrals
  FOR SELECT TO authenticated
  USING (referrer_tester_id IN (
    SELECT id FROM public.beta_testers WHERE user_id = auth.uid()
  ));

-- Generate referral_code for existing testers that don't have one
UPDATE public.beta_testers 
SET referral_code = encode(extensions.gen_random_bytes(8), 'hex') 
WHERE referral_code IS NULL;
