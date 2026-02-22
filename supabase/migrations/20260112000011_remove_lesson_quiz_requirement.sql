-- Remove lesson quiz requirement
-- Date: 2026-01-12
-- Description: Remove the constraint requiring quiz scores for lesson completion
--              Lessons can now be completed simply by reading the content

-- =============================================================================
-- Drop the constraint that requires best_quiz_score for completion
-- =============================================================================

ALTER TABLE public.user_lesson_progress
DROP CONSTRAINT IF EXISTS valid_lesson_completion;

-- =============================================================================
-- Add new constraint that only requires completed_at for completion
-- =============================================================================

ALTER TABLE public.user_lesson_progress
ADD CONSTRAINT valid_lesson_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
);

-- =============================================================================
-- Update existing quiz_pending records to completed (if any)
-- =============================================================================

UPDATE public.user_lesson_progress
SET status = 'completed',
    completed_at = COALESCE(completed_at, NOW())
WHERE status = 'quiz_pending'
AND progress_percentage = 100;

-- =============================================================================
-- Update comment to reflect new behavior
-- =============================================================================

COMMENT ON COLUMN public.user_lesson_progress.status IS 'locked: not yet accessible, in_progress: reading content, completed: finished reading (quiz no longer required)';
COMMENT ON COLUMN public.user_lesson_progress.best_quiz_score IS 'Best score achieved on lesson quiz (optional - quizzes are no longer required for completion)';

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Lesson quiz requirement removed successfully';
    RAISE NOTICE '📖 Lessons can now be completed by reading alone';
    RAISE NOTICE '🔓 Updated % quiz_pending lessons to completed', (
        SELECT COUNT(*) FROM public.user_lesson_progress
        WHERE status = 'quiz_pending' AND progress_percentage = 100
    );
END $$;
