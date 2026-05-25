
-- Table for ad impact feedback survey
CREATE TABLE public.ads_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('no_impact','slight','moderate','heavy','unusable')),
  affects_reading BOOLEAN NOT NULL DEFAULT false,
  affects_browsing BOOLEAN NOT NULL DEFAULT false,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit feedback
CREATE POLICY "Anyone can submit ads feedback"
ON public.ads_feedback FOR INSERT
TO public
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own ads feedback"
ON public.ads_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all ads feedback"
ON public.ads_feedback FOR SELECT
TO authenticated
USING (public.is_admin_user((auth.jwt() ->> 'email')));

-- Admins can delete feedback
CREATE POLICY "Admins can delete ads feedback"
ON public.ads_feedback FOR DELETE
TO authenticated
USING (public.is_admin_user((auth.jwt() ->> 'email')));

CREATE INDEX idx_ads_feedback_created_at ON public.ads_feedback (created_at DESC);
CREATE INDEX idx_ads_feedback_user_id ON public.ads_feedback (user_id);
