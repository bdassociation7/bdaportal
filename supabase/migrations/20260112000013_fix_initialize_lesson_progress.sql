-- Fix initialize_lesson_progress to handle existing records
-- Date: 2026-01-12
-- Description: Update the function to also fix existing progress records
--              that are all locked (should unlock first lesson)

-- =============================================================================
-- Replace initialize_lesson_progress to handle existing records
-- =============================================================================

CREATE OR REPLACE FUNCTION public.initialize_lesson_progress(
    p_user_id UUID,
    p_certification_type certification_type
) RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
    v_first_behavioral_module_id UUID;
    v_first_lesson_id UUID;
BEGIN
    -- Get the first behavioral module ID (this is the starting point)
    SELECT id INTO v_first_behavioral_module_id
    FROM public.curriculum_modules
    WHERE certification_type = p_certification_type
    AND section_type = 'behavioral'
    AND is_published = true
    ORDER BY order_index
    LIMIT 1;

    -- Get the first lesson of the first behavioral module
    SELECT l.id INTO v_first_lesson_id
    FROM public.curriculum_lessons l
    WHERE l.module_id = v_first_behavioral_module_id
    AND l.is_published = true
    ORDER BY l.order_index
    LIMIT 1;

    -- Insert progress records for all published lessons that don't exist
    INSERT INTO public.user_lesson_progress (user_id, lesson_id, status)
    SELECT
        p_user_id,
        l.id,
        CASE
            -- First lesson of first BEHAVIORAL module is unlocked
            WHEN l.id = v_first_lesson_id THEN 'in_progress'
            ELSE 'locked'
        END as status
    FROM public.curriculum_lessons l
    JOIN public.curriculum_modules m ON m.id = l.module_id
    WHERE m.certification_type = p_certification_type
    AND l.is_published = true
    AND NOT EXISTS (
        SELECT 1 FROM public.user_lesson_progress
        WHERE user_id = p_user_id AND lesson_id = l.id
    );

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    -- IMPORTANT: If records already exist, ensure first lesson is unlocked
    -- This fixes cases where all lessons were created as locked
    IF v_inserted_count = 0 AND v_first_lesson_id IS NOT NULL THEN
        -- Check if first lesson exists but is locked
        IF EXISTS (
            SELECT 1 FROM public.user_lesson_progress
            WHERE user_id = p_user_id
            AND lesson_id = v_first_lesson_id
            AND status = 'locked'
        ) THEN
            -- Unlock the first lesson
            UPDATE public.user_lesson_progress
            SET status = 'in_progress',
                updated_at = NOW()
            WHERE user_id = p_user_id
            AND lesson_id = v_first_lesson_id;

            -- Return -1 to indicate we fixed existing records
            v_inserted_count := -1;
        END IF;
    END IF;

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.initialize_lesson_progress(UUID, certification_type) TO authenticated;

-- =============================================================================
-- Fix existing users who have all locked lessons
-- =============================================================================

DO $$
DECLARE
    v_user_record RECORD;
    v_first_lesson_id UUID;
BEGIN
    -- For each user who has progress records but NO in_progress lessons
    FOR v_user_record IN
        SELECT DISTINCT ulp.user_id, m.certification_type
        FROM public.user_lesson_progress ulp
        JOIN public.curriculum_lessons l ON l.id = ulp.lesson_id
        JOIN public.curriculum_modules m ON m.id = l.module_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_lesson_progress ulp2
            WHERE ulp2.user_id = ulp.user_id
            AND ulp2.status IN ('in_progress', 'completed')
        )
        GROUP BY ulp.user_id, m.certification_type
    LOOP
        -- Get the first lesson of first behavioral module for this certification type
        SELECT l.id INTO v_first_lesson_id
        FROM public.curriculum_modules m
        JOIN public.curriculum_lessons l ON l.module_id = m.id
        WHERE m.certification_type = v_user_record.certification_type
        AND m.section_type = 'behavioral'
        AND m.is_published = true
        AND l.is_published = true
        AND l.order_index = 1
        ORDER BY m.order_index
        LIMIT 1;

        -- Unlock the first lesson for this user
        IF v_first_lesson_id IS NOT NULL THEN
            UPDATE public.user_lesson_progress
            SET status = 'in_progress',
                updated_at = NOW()
            WHERE user_id = v_user_record.user_id
            AND lesson_id = v_first_lesson_id
            AND status = 'locked';

            RAISE NOTICE 'Fixed progress for user % - unlocked first lesson', v_user_record.user_id;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed initialize_lesson_progress function';
    RAISE NOTICE '✅ Fixed existing users with all locked lessons';
    RAISE NOTICE '📖 First lesson of first behavioral module will now always be unlocked';
END $$;
