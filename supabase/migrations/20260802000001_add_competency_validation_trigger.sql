-- ============================================================
-- Migration: Add competency name validation trigger
-- 
-- Prevents inserting questions into certification_question_bank
-- with a competency_name that does not exist in eco_blueprint_config.
-- This blocks accidental imports of lesson/practice questions
-- into the official certification exam question bank.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_certification_competency_name()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_count INTEGER;
BEGIN
  -- Allow NULL competency_name (no restriction)
  IF NEW.competency_name IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate that competency_name exists in eco_blueprint_config
  -- for the given certification_type
  SELECT COUNT(*) INTO v_valid_count
  FROM public.eco_blueprint_config
  WHERE certification_type::text = NEW.certification_type
    AND competency_name = NEW.competency_name;
  
  IF v_valid_count = 0 THEN
    RAISE EXCEPTION 'Invalid competency_name for certification_type. Must match a competency in eco_blueprint_config.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists, then recreate
DROP TRIGGER IF EXISTS trg_validate_competency_name ON public.certification_question_bank;

CREATE TRIGGER trg_validate_competency_name
  BEFORE INSERT OR UPDATE ON public.certification_question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_certification_competency_name();

COMMENT ON FUNCTION public.validate_certification_competency_name() IS 
  'Validates that competency_name in certification_question_bank matches an official competency in eco_blueprint_config. Prevents accidental import of lesson/practice questions into the official exam bank.';
