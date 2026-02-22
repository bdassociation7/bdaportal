-- Migration: Add exam_language to quizzes table
-- Date: 2025-12-29
-- Description: Add exam_language field to separate Arabic and English certification exams

-- Use the existing exam_language enum type (created in 20251228100000)
-- If it doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_language') THEN
        CREATE TYPE exam_language AS ENUM ('en', 'ar');
    END IF;
END$$;

-- Add exam_language column to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Create index for filtering by language
CREATE INDEX IF NOT EXISTS idx_quizzes_exam_language ON public.quizzes(exam_language);

-- Add comment
COMMENT ON COLUMN public.quizzes.exam_language IS 'Language of the exam: en (English) or ar (Arabic). Each certification exam is language-specific.';
