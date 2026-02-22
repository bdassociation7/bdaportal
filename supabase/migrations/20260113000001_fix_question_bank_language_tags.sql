-- Fix Question Bank Language Tags
-- This migration fixes question sets that have Arabic content but were incorrectly tagged as English

-- Update question sets with Arabic titles to have exam_language = 'ar'
-- Arabic Unicode range: U+0600 to U+06FF
UPDATE public.curriculum_question_sets
SET exam_language = 'ar'
WHERE exam_language = 'en'
AND (
  -- Title contains Arabic characters
  title ~ '[\u0600-\u06FF]'
  OR title_ar ~ '[\u0600-\u06FF]'
);

-- Log the fix
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % question sets with Arabic content that were incorrectly tagged as English', affected_count;
END $$;

-- Also ensure any standalone Arabic question sets get linked to Arabic modules if possible
-- (This is informational - actual linking should be done via admin UI)
COMMENT ON TABLE public.curriculum_question_sets IS
'Question Bank sets. IMPORTANT: exam_language must match the content language (en for English, ar for Arabic). Admin should ensure competency_id links to modules of the same language.';
