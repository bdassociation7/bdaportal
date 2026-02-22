-- Migration: Fix flashcard deck exam_language
-- Description: Set default exam_language for existing flashcard decks
-- Date: 2025-12-31

-- Update existing flashcard decks that have NULL exam_language to default to 'en'
UPDATE public.curriculum_flashcard_decks
SET exam_language = 'en'
WHERE exam_language IS NULL;

-- Set default value for exam_language column if not already set
ALTER TABLE public.curriculum_flashcard_decks
ALTER COLUMN exam_language SET DEFAULT 'en';

-- Make exam_language NOT NULL (all existing rows now have a value)
ALTER TABLE public.curriculum_flashcard_decks
ALTER COLUMN exam_language SET NOT NULL;

-- Log the update
DO $$
DECLARE
  deck_count INTEGER;
  en_count INTEGER;
  ar_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deck_count FROM public.curriculum_flashcard_decks;
  SELECT COUNT(*) INTO en_count FROM public.curriculum_flashcard_decks WHERE exam_language = 'en';
  SELECT COUNT(*) INTO ar_count FROM public.curriculum_flashcard_decks WHERE exam_language = 'ar';
  RAISE NOTICE 'Total flashcard decks: %, English: %, Arabic: %', deck_count, en_count, ar_count;
END $$;
