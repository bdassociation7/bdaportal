-- Migration: eco_blueprint_config
-- Stores the ECO (Exam Content Outline) blueprint: how many questions
-- to draw per competency for each certification type per exam attempt.
-- Configured by admins via the ECO Blueprint Manager in the admin panel.

CREATE TABLE public.eco_blueprint_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_type certification_type NOT NULL,
  domain             TEXT NOT NULL CHECK (domain IN ('behavioral', 'knowledge_based')),
  competency_name    TEXT NOT NULL,
  question_count     INTEGER NOT NULL CHECK (question_count > 0),
  order_index        INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (certification_type, competency_name)
);

COMMENT ON TABLE public.eco_blueprint_config IS
  'ECO blueprint weights: how many questions to draw per competency per 120-question exam attempt. '
  'Configured via admin panel. question_count must not exceed pool size in any language bank.';

-- Indexes
CREATE INDEX ON public.eco_blueprint_config (certification_type);
CREATE INDEX ON public.eco_blueprint_config (certification_type, domain);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_eco_blueprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eco_blueprint_updated_at
  BEFORE UPDATE ON public.eco_blueprint_config
  FOR EACH ROW EXECUTE FUNCTION public.update_eco_blueprint_updated_at();

-- RLS
ALTER TABLE public.eco_blueprint_config ENABLE ROW LEVEL SECURITY;

-- Admins can read, write, update, delete
CREATE POLICY "Admins manage eco_blueprint_config"
ON public.eco_blueprint_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
);

-- All authenticated users can read (needed by randomization engine)
CREATE POLICY "Authenticated users read eco_blueprint_config"
ON public.eco_blueprint_config FOR SELECT TO authenticated
USING (true);
