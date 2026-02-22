-- Add exam_language field to Learning System tables for full language separation
-- Arabic and English content will be managed as separate entities
-- Note: This is a repair migration that handles partial state

-- 1. Add exam_language to curriculum_modules (IF NOT EXISTS handles partial state)
ALTER TABLE public.curriculum_modules
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Remove the old unique constraint on order_index (to allow same order for different languages)
ALTER TABLE public.curriculum_modules
DROP CONSTRAINT IF EXISTS curriculum_modules_order_index_key;

-- Add composite unique constraint with language (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'curriculum_modules_order_cert_lang_unique'
    ) THEN
        ALTER TABLE public.curriculum_modules
        ADD CONSTRAINT curriculum_modules_order_cert_lang_unique
        UNIQUE(certification_type, order_index, exam_language);
    END IF;
END $$;

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_curriculum_modules_language
ON public.curriculum_modules(exam_language);


-- 2. Add exam_language to curriculum_lessons
ALTER TABLE public.curriculum_lessons
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_language
ON public.curriculum_lessons(exam_language);


-- 3. Add exam_language to curriculum_question_sets
ALTER TABLE public.curriculum_question_sets
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_curriculum_question_sets_language
ON public.curriculum_question_sets(exam_language);


-- 4. Add exam_language to curriculum_flashcard_decks
ALTER TABLE public.curriculum_flashcard_decks
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_curriculum_flashcard_decks_language
ON public.curriculum_flashcard_decks(exam_language);
