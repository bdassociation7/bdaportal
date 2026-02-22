-- Auto-complete modules when all lessons are completed
-- Date: 2026-01-12
-- Description: Automatically update module status to 'completed' when all lessons are done
--              This ensures next modules unlock automatically

-- =============================================================================
-- Create function to check if all lessons in a module are completed
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_module_completion(
    p_user_id UUID,
    p_module_id UUID
) RETURNS VOID AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
BEGIN
    -- Count total lessons in the module
    SELECT COUNT(*)
    INTO v_total_lessons
    FROM public.curriculum_lessons
    WHERE module_id = p_module_id AND is_published = true;

    -- Count completed lessons for this user
    SELECT COUNT(*)
    INTO v_completed_lessons
    FROM public.user_lesson_progress ulp
    JOIN public.curriculum_lessons l ON l.id = ulp.lesson_id
    WHERE l.module_id = p_module_id
    AND ulp.user_id = p_user_id
    AND ulp.status = 'completed';

    -- If all lessons are completed, mark module as completed
    IF v_total_lessons > 0 AND v_completed_lessons = v_total_lessons THEN
        UPDATE public.user_curriculum_progress
        SET
            status = 'completed',
            progress_percentage = 100,
            completed_at = COALESCE(completed_at, NOW())
        WHERE user_id = p_user_id
        AND module_id = p_module_id
        AND status != 'completed';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Create trigger function to auto-check module completion
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_check_module_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_module_id UUID;
BEGIN
    -- Only check when a lesson is marked as completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get the module_id for this lesson
        SELECT module_id INTO v_module_id
        FROM public.curriculum_lessons
        WHERE id = NEW.lesson_id;

        -- Check if module should be completed
        IF v_module_id IS NOT NULL THEN
            PERFORM public.check_module_completion(NEW.user_id, v_module_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Create trigger on lesson progress updates
-- =============================================================================

DROP TRIGGER IF EXISTS auto_check_module_completion_trigger ON public.user_lesson_progress;

CREATE TRIGGER auto_check_module_completion_trigger
    AFTER INSERT OR UPDATE ON public.user_lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_check_module_completion();

-- =============================================================================
-- Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.check_module_completion(UUID, UUID) TO authenticated;

-- =============================================================================
-- Update existing module progress for users who have completed all lessons
-- =============================================================================

DO $$
DECLARE
    v_progress RECORD;
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
BEGIN
    -- For each user module progress
    FOR v_progress IN
        SELECT DISTINCT ucp.user_id, ucp.module_id
        FROM public.user_curriculum_progress ucp
        WHERE ucp.status != 'completed'
    LOOP
        -- Count total lessons in the module
        SELECT COUNT(*)
        INTO v_total_lessons
        FROM public.curriculum_lessons
        WHERE module_id = v_progress.module_id AND is_published = true;

        -- Count completed lessons for this user
        SELECT COUNT(*)
        INTO v_completed_lessons
        FROM public.user_lesson_progress ulp
        JOIN public.curriculum_lessons l ON l.id = ulp.lesson_id
        WHERE l.module_id = v_progress.module_id
        AND ulp.user_id = v_progress.user_id
        AND ulp.status = 'completed';

        -- If all lessons are completed, mark module as completed
        IF v_total_lessons > 0 AND v_completed_lessons = v_total_lessons THEN
            UPDATE public.user_curriculum_progress
            SET
                status = 'completed',
                progress_percentage = 100,
                completed_at = COALESCE(completed_at, NOW())
            WHERE user_id = v_progress.user_id
            AND module_id = v_progress.module_id;

            RAISE NOTICE '✅ Module % completed for user %', v_progress.module_id, v_progress.user_id;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Auto-complete module trigger created successfully';
    RAISE NOTICE '🔓 Modules will now complete automatically when all lessons are done';
END $$;
