-- Certificate Design Configuration
-- Stores text positions, fonts, and colors for certificate generation

CREATE TABLE IF NOT EXISTS public.certificate_design_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('CP', 'SCP', 'MEMBERSHIP')),
  field_name TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  font_size INTEGER NOT NULL DEFAULT 44,
  font_weight TEXT NOT NULL DEFAULT '600',
  color TEXT NOT NULL DEFAULT '#1c4a8b',
  max_width INTEGER,
  text_align TEXT NOT NULL DEFAULT 'left' CHECK (text_align IN ('left', 'center', 'right')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  UNIQUE(certificate_type, field_name)
);

-- Enable RLS
ALTER TABLE public.certificate_design_config ENABLE ROW LEVEL SECURITY;

-- Admins can read/write
CREATE POLICY "Admins can manage certificate design config"
  ON public.certificate_design_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Everyone can read (for certificate generation)
CREATE POLICY "Anyone can read certificate design config"
  ON public.certificate_design_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to get config for a certificate type
CREATE OR REPLACE FUNCTION public.get_certificate_design_config(p_certificate_type TEXT)
RETURNS TABLE (
  field_name TEXT,
  x INTEGER,
  y INTEGER,
  font_size INTEGER,
  font_weight TEXT,
  color TEXT,
  max_width INTEGER,
  text_align TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    field_name,
    x,
    y,
    font_size,
    font_weight,
    color,
    max_width,
    text_align
  FROM public.certificate_design_config
  WHERE certificate_type = p_certificate_type;
$$;

-- Function to upsert config
CREATE OR REPLACE FUNCTION public.upsert_certificate_design_config(
  p_certificate_type TEXT,
  p_field_name TEXT,
  p_x INTEGER,
  p_y INTEGER,
  p_font_size INTEGER,
  p_font_weight TEXT,
  p_color TEXT,
  p_max_width INTEGER DEFAULT NULL,
  p_text_align TEXT DEFAULT 'left'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.certificate_design_config (
    certificate_type, field_name, x, y, font_size, font_weight, color, max_width, text_align, updated_by
  )
  VALUES (
    p_certificate_type, p_field_name, p_x, p_y, p_font_size, p_font_weight, p_color, p_max_width, p_text_align, auth.uid()
  )
  ON CONFLICT (certificate_type, field_name)
  DO UPDATE SET
    x = p_x,
    y = p_y,
    font_size = p_font_size,
    font_weight = p_font_weight,
    color = p_color,
    max_width = p_max_width,
    text_align = p_text_align,
    updated_at = NOW(),
    updated_by = auth.uid()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Insert default values (matching current hardcoded positions)
-- CP Certificate
INSERT INTO public.certificate_design_config (certificate_type, field_name, x, y, font_size, font_weight, color, max_width, text_align)
VALUES
  ('CP', 'holderName', 1540, 820, 92, 'bold', '#1c4a8b', 1700, 'left'),
  ('CP', 'credentialId', 2302, 1885, 44, '600', '#1c4a8b', NULL, 'center'),
  ('CP', 'issueDate', 2818, 1885, 44, '600', '#1c4a8b', NULL, 'center')
ON CONFLICT (certificate_type, field_name) DO NOTHING;

-- SCP Certificate (same positions as CP)
INSERT INTO public.certificate_design_config (certificate_type, field_name, x, y, font_size, font_weight, color, max_width, text_align)
VALUES
  ('SCP', 'holderName', 1540, 820, 92, 'bold', '#1c4a8b', 1700, 'left'),
  ('SCP', 'credentialId', 2302, 1885, 44, '600', '#1c4a8b', NULL, 'center'),
  ('SCP', 'issueDate', 2818, 1885, 44, '600', '#1c4a8b', NULL, 'center')
ON CONFLICT (certificate_type, field_name) DO NOTHING;

-- Membership Certificate
INSERT INTO public.certificate_design_config (certificate_type, field_name, x, y, font_size, font_weight, color, max_width, text_align)
VALUES
  ('MEMBERSHIP', 'holderName', 290, 1050, 72, 'bold', '#1c4a8b', 2000, 'left'),
  ('MEMBERSHIP', 'membershipId', 1200, 1875, 48, '600', '#1c4a8b', NULL, 'left'),
  ('MEMBERSHIP', 'issuedDate', 550, 2375, 36, '600', '#ffffff', NULL, 'left'),
  ('MEMBERSHIP', 'expiryDate', 1550, 2375, 36, '600', '#ffffff', NULL, 'left')
ON CONFLICT (certificate_type, field_name) DO NOTHING;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Certificate design config table created with default values';
END $$;
