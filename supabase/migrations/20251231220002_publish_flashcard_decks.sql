-- Migration: Publish all flashcard decks
-- Description: Ensure all flashcard decks are published so learners can see them
-- Date: 2025-12-31

-- Publish all flashcard decks that are currently unpublished
UPDATE public.curriculum_flashcard_decks
SET is_published = true
WHERE is_published = false;

-- Log the update
DO $$
DECLARE
  published_count INTEGER;
  total_cards INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count FROM public.curriculum_flashcard_decks WHERE is_published = true;
  SELECT COALESCE(SUM(card_count), 0) INTO total_cards FROM public.curriculum_flashcard_decks WHERE is_published = true;
  RAISE NOTICE 'Published flashcard decks: %, Total cards available: %', published_count, total_cards;
END $$;
