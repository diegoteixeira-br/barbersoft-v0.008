
-- Add referral_code column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral_code on company creation
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.companies
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();

-- Generate referral codes for existing companies that don't have one
UPDATE public.companies 
SET referral_code = upper(substr(md5(id::text || now()::text || random()::text), 1, 8))
WHERE referral_code IS NULL;

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  referred_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_company_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals where they own either company
CREATE POLICY "Users can view their referrals"
ON public.referrals
FOR SELECT
USING (
  user_owns_company(referrer_company_id) OR user_owns_company(referred_company_id)
);

-- Only service_role can insert/update (via edge functions)
-- No INSERT/UPDATE policies for authenticated users
