-- Migration: Add certification_type to curriculum_practice_questions
-- Purpose: Allow each question to be targeted at CP, SCP, or both certifications
-- The question_set is now shared between certifications; filtering happens at question level

-- Add certification_type column to curriculum_practice_questions
-- NULL means the question applies to BOTH certifications (CP and SCP)
ALTER TABLE curriculum_practice_questions
  ADD COLUMN IF NOT EXISTS certification_target TEXT DEFAULT NULL
  CHECK (certification_target IN ('CP', 'SCP', NULL));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_practice_questions_cert_target
  ON curriculum_practice_questions(certification_target);

-- Comment for documentation
COMMENT ON COLUMN curriculum_practice_questions.certification_target IS
  'NULL = applies to both CP and SCP; CP = BDA-CP only; SCP = BDA-SCP only';
