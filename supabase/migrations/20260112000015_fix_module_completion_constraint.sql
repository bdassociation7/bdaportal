-- Fix module completion constraint to allow completion without quiz score
-- Date: 2026-01-12
-- Description: Modules can be completed by finishing all lessons, quiz is optional

-- =============================================================================
-- Drop existing constraint and recreate with relaxed requirements
-- =============================================================================

ALTER TABLE public.user_curriculum_progress
    DROP CONSTRAINT IF EXISTS valid_completion;

-- New constraint: completed_at must be set if status is completed, quiz score is optional
ALTER TABLE public.user_curriculum_progress
    ADD CONSTRAINT valid_completion CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed')
    );

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Updated valid_completion constraint - quiz score now optional for completion';
END $$;
