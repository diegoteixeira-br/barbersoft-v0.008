
-- Function to process referral during signup (bypasses RLS to find referrer)
CREATE OR REPLACE FUNCTION public.process_referral_signup(
  p_referred_company_id uuid,
  p_referral_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_company_id uuid;
BEGIN
  -- Find the referrer company by code
  SELECT id INTO v_referrer_company_id
  FROM companies
  WHERE referral_code = p_referral_code
  LIMIT 1;

  -- If no referrer found or self-referral, return false
  IF v_referrer_company_id IS NULL OR v_referrer_company_id = p_referred_company_id THEN
    RETURN false;
  END IF;

  -- Update the referred company's signup_source
  UPDATE companies
  SET signup_source = 'ref:' || p_referral_code
  WHERE id = p_referred_company_id
    AND owner_user_id = auth.uid();

  -- Create the referral record (pending status)
  INSERT INTO referrals (referrer_company_id, referred_company_id, status)
  VALUES (v_referrer_company_id, p_referred_company_id, 'pending')
  ON CONFLICT (referred_company_id) DO NOTHING;

  RETURN true;
END;
$$;
