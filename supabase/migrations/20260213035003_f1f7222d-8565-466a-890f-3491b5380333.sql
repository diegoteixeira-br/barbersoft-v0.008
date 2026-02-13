
-- Allow public read of influencer by term_token (for the acceptance page)
CREATE POLICY "Public can read influencer by term_token"
ON public.influencer_partnerships
FOR SELECT
USING (true);

-- Allow public update of term_accepted_at by term_token
CREATE POLICY "Public can accept term via token"
ON public.influencer_partnerships
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow public read of active term templates
CREATE POLICY "Public can read active term templates"
ON public.influencer_term_templates
FOR SELECT
USING (is_active = true);
