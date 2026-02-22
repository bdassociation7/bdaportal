-- Migration: Fix Learning System to unlock Behavioral competencies FIRST
-- Issue: Knowledge-Based (order_index 1-7) was unlocking first instead of Behavioral (order_index 8-14)
-- Solution: Update progress initialization and module unlock logic to use section_type ordering

-- =============================================================================
-- 1. Create helper function to get the correct ordering (Behavioral first)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_section_order(p_section_type TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Behavioral comes FIRST (order 1), Knowledge-Based comes SECOND (order 2)
    RETURN CASE
        WHEN p_section_type = 'behavioral' THEN 1
        WHEN p_section_type = 'knowledge_based' THEN 2
        ELSE 3
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 2. Update initialize_user_progress to unlock first BEHAVIORAL module
-- =============================================================================

CREATE OR REPLACE FUNCTION public.initialize_user_progress(
    p_user_id UUID,
    p_certification_type certification_type
) RETURNS VOID AS $$
DECLARE
    v_module RECORD;
    v_first_module BOOLEAN := TRUE;
BEGIN
    -- Loop through modules ordered by section_type (Behavioral first) then order_index
    FOR v_module IN
        SELECT id, order_index, section_type
        FROM public.curriculum_modules
        WHERE certification_type = p_certification_type AND is_published = true
        ORDER BY
            CASE section_type
                WHEN 'behavioral' THEN 1
                WHEN 'knowledge_based' THEN 2
            END,
            order_index
    LOOP
        INSERT INTO public.user_curriculum_progress (
            user_id,
            module_id,
            status,
            progress_percentage
        ) VALUES (
            p_user_id,
            v_module.id,
            CASE WHEN v_first_module THEN 'in_progress' ELSE 'locked' END,
            0
        )
        ON CONFLICT (user_id, module_id) DO NOTHING;

        v_first_module := FALSE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. Update is_module_unlocked to use correct ordering
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_module_unlocked(
    p_user_id UUID,
    p_module_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_module RECORD;
    v_previous_module_id UUID;
    v_previous_status TEXT;
BEGIN
    -- Get current module details
    SELECT id, order_index, section_type, certification_type, prerequisite_module_id
    INTO v_module
    FROM public.curriculum_modules
    WHERE id = p_module_id;

    -- If module has explicit prerequisite, check that first
    IF v_module.prerequisite_module_id IS NOT NULL THEN
        SELECT status INTO v_previous_status
        FROM public.user_curriculum_progress
        WHERE user_id = p_user_id AND module_id = v_module.prerequisite_module_id;

        RETURN COALESCE(v_previous_status = 'completed', FALSE);
    END IF;

    -- Check if this is the first module in the learning sequence
    -- First Behavioral module (lowest order_index in behavioral section) is always unlocked
    IF v_module.section_type = 'behavioral' THEN
        -- Check if this is the first behavioral module
        IF NOT EXISTS (
            SELECT 1 FROM public.curriculum_modules
            WHERE certification_type = v_module.certification_type
            AND section_type = 'behavioral'
            AND is_published = true
            AND order_index < v_module.order_index
        ) THEN
            RETURN TRUE;
        END IF;

        -- Otherwise, check if previous behavioral module is completed
        SELECT id INTO v_previous_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = 'behavioral'
        AND is_published = true
        AND order_index < v_module.order_index
        ORDER BY order_index DESC
        LIMIT 1;
    ELSE
        -- Knowledge-based modules: first one requires ALL behavioral to be completed
        IF NOT EXISTS (
            SELECT 1 FROM public.curriculum_modules
            WHERE certification_type = v_module.certification_type
            AND section_type = 'knowledge_based'
            AND is_published = true
            AND order_index < v_module.order_index
        ) THEN
            -- First knowledge module: check if ALL behavioral modules are completed
            RETURN NOT EXISTS (
                SELECT 1
                FROM public.curriculum_modules m
                LEFT JOIN public.user_curriculum_progress p
                    ON p.module_id = m.id AND p.user_id = p_user_id
                WHERE m.certification_type = v_module.certification_type
                AND m.section_type = 'behavioral'
                AND m.is_published = true
                AND COALESCE(p.status, 'locked') != 'completed'
            );
        END IF;

        -- Otherwise, check if previous knowledge module is completed
        SELECT id INTO v_previous_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = 'knowledge_based'
        AND is_published = true
        AND order_index < v_module.order_index
        ORDER BY order_index DESC
        LIMIT 1;
    END IF;

    -- Check if previous module is completed
    IF v_previous_module_id IS NULL THEN
        RETURN TRUE;
    END IF;

    SELECT status INTO v_previous_status
    FROM public.user_curriculum_progress
    WHERE user_id = p_user_id AND module_id = v_previous_module_id;

    RETURN COALESCE(v_previous_status = 'completed', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. Update get_next_unlocked_module to use correct ordering
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_unlocked_module(
    p_user_id UUID,
    p_certification_type certification_type,
    p_exam_language exam_language DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_module_id UUID;
BEGIN
    -- Find the next module that is unlocked and not completed
    -- Order: Behavioral first, then Knowledge-Based, then by order_index
    SELECT m.id INTO v_module_id
    FROM public.curriculum_modules m
    LEFT JOIN public.user_curriculum_progress p
        ON p.module_id = m.id AND p.user_id = p_user_id
    WHERE m.certification_type = p_certification_type
    AND m.is_published = true
    AND (p_exam_language IS NULL OR m.exam_language = p_exam_language)
    AND COALESCE(p.status, 'locked') NOT IN ('completed')
    AND public.is_module_unlocked(p_user_id, m.id)
    ORDER BY
        CASE m.section_type
            WHEN 'behavioral' THEN 1
            WHEN 'knowledge_based' THEN 2
        END,
        m.order_index
    LIMIT 1;

    RETURN v_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. Update existing users' progress to fix incorrect unlock state
-- This resets in_progress to the correct first behavioral module
-- =============================================================================

-- For users who have no completed modules, reset their progress
-- to start from the first Behavioral module instead of first Knowledge-Based
DO $$
DECLARE
    v_user RECORD;
    v_first_behavioral_id UUID;
BEGIN
    -- For each user with curriculum progress
    FOR v_user IN
        SELECT DISTINCT user_id
        FROM public.user_curriculum_progress
        WHERE status = 'in_progress'
    LOOP
        -- Check if user has any completed modules
        IF NOT EXISTS (
            SELECT 1 FROM public.user_curriculum_progress
            WHERE user_id = v_user.user_id AND status = 'completed'
        ) THEN
            -- Get the first behavioral module
            SELECT m.id INTO v_first_behavioral_id
            FROM public.curriculum_modules m
            JOIN public.user_curriculum_progress p ON p.module_id = m.id
            WHERE p.user_id = v_user.user_id
            AND m.section_type = 'behavioral'
            ORDER BY m.order_index
            LIMIT 1;

            IF v_first_behavioral_id IS NOT NULL THEN
                -- Reset all to locked
                UPDATE public.user_curriculum_progress
                SET status = 'locked'
                WHERE user_id = v_user.user_id
                AND status = 'in_progress';

                -- Set first behavioral to in_progress
                UPDATE public.user_curriculum_progress
                SET status = 'in_progress'
                WHERE user_id = v_user.user_id
                AND module_id = v_first_behavioral_id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- 6. Fix initialize_lesson_progress to unlock first BEHAVIORAL module's first lesson
-- =============================================================================

CREATE OR REPLACE FUNCTION public.initialize_lesson_progress(
    p_user_id UUID,
    p_certification_type certification_type
) RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
    v_first_behavioral_module_id UUID;
BEGIN
    -- Get the first behavioral module ID (this is the starting point)
    SELECT id INTO v_first_behavioral_module_id
    FROM public.curriculum_modules
    WHERE certification_type = p_certification_type
    AND section_type = 'behavioral'
    AND is_published = true
    ORDER BY order_index
    LIMIT 1;

    -- Insert progress records for all published lessons
    INSERT INTO public.user_lesson_progress (user_id, lesson_id, status)
    SELECT
        p_user_id,
        l.id,
        CASE
            -- First lesson of first BEHAVIORAL module is unlocked
            WHEN m.id = v_first_behavioral_module_id AND l.order_index = 1 THEN 'in_progress'
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
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. Fix is_lesson_unlocked to handle lessons without quiz requirement
-- Lessons without quiz should unlock next lesson when content is complete (100%)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_lesson_unlocked(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_lesson RECORD;
    v_module RECORD;
    v_previous_lesson RECORD;
    v_previous_status TEXT;
    v_previous_progress INTEGER;
    v_previous_quiz_required BOOLEAN;
    v_module_unlocked BOOLEAN;
BEGIN
    -- Get lesson details
    SELECT l.*, m.id as module_id, m.section_type, m.certification_type, m.order_index as module_order
    INTO v_lesson
    FROM public.curriculum_lessons l
    JOIN public.curriculum_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id;

    IF v_lesson IS NULL THEN
        RETURN FALSE;
    END IF;

    -- First, check if parent module is unlocked
    v_module_unlocked := public.is_module_unlocked(p_user_id, v_lesson.module_id);
    IF NOT v_module_unlocked THEN
        RETURN FALSE;
    END IF;

    -- If first lesson (order_index = 1), it's unlocked if module is unlocked
    IF v_lesson.order_index = 1 THEN
        RETURN TRUE;
    END IF;

    -- Get previous lesson details
    SELECT l.*, m.id as module_id
    INTO v_previous_lesson
    FROM public.curriculum_lessons l
    JOIN public.curriculum_modules m ON m.id = l.module_id
    WHERE l.module_id = v_lesson.module_id
    AND l.order_index = v_lesson.order_index - 1;

    IF v_previous_lesson IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check previous lesson progress
    SELECT status, progress_percentage
    INTO v_previous_status, v_previous_progress
    FROM public.user_lesson_progress
    WHERE user_id = p_user_id AND lesson_id = v_previous_lesson.id;

    -- If previous lesson is completed, unlock
    IF v_previous_status = 'completed' THEN
        RETURN TRUE;
    END IF;

    -- If previous lesson has no quiz requirement and progress is 100%, treat as complete
    IF v_previous_lesson.quiz_required = FALSE AND COALESCE(v_previous_progress, 0) >= 100 THEN
        RETURN TRUE;
    END IF;

    -- If previous lesson is quiz_pending and quiz is not required, unlock
    IF v_previous_status = 'quiz_pending' AND v_previous_lesson.quiz_required = FALSE THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. Create function to auto-complete lessons without quiz
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_complete_non_quiz_lessons()
RETURNS TRIGGER AS $$
BEGIN
    -- If lesson reaches 100% progress and has no quiz requirement, mark as completed
    IF NEW.progress_percentage >= 100 AND NEW.status != 'completed' THEN
        -- Check if lesson requires quiz
        IF NOT EXISTS (
            SELECT 1 FROM public.curriculum_lessons
            WHERE id = NEW.lesson_id AND quiz_required = TRUE
        ) THEN
            NEW.status := 'completed';
            NEW.completed_at := NOW();
        ELSIF NEW.status = 'in_progress' OR NEW.status = 'locked' THEN
            -- If quiz is required, move to quiz_pending
            NEW.status := 'quiz_pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_complete_non_quiz_lessons_trigger ON public.user_lesson_progress;

CREATE TRIGGER auto_complete_non_quiz_lessons_trigger
    BEFORE UPDATE ON public.user_lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_complete_non_quiz_lessons();

-- =============================================================================
-- 9. Fix existing lesson progress for users who have no completed lessons
-- =============================================================================

DO $$
DECLARE
    v_user RECORD;
    v_first_behavioral_lesson_id UUID;
BEGIN
    -- For each user with lesson progress
    FOR v_user IN
        SELECT DISTINCT user_id
        FROM public.user_lesson_progress
        WHERE status = 'in_progress'
    LOOP
        -- Check if user has any completed lessons
        IF NOT EXISTS (
            SELECT 1 FROM public.user_lesson_progress
            WHERE user_id = v_user.user_id AND status = 'completed'
        ) THEN
            -- Get the first lesson of the first behavioral module
            SELECT l.id INTO v_first_behavioral_lesson_id
            FROM public.curriculum_lessons l
            JOIN public.curriculum_modules m ON m.id = l.module_id
            JOIN public.user_lesson_progress p ON p.lesson_id = l.id
            WHERE p.user_id = v_user.user_id
            AND m.section_type = 'behavioral'
            AND l.order_index = 1
            ORDER BY m.order_index
            LIMIT 1;

            IF v_first_behavioral_lesson_id IS NOT NULL THEN
                -- Reset all to locked
                UPDATE public.user_lesson_progress
                SET status = 'locked'
                WHERE user_id = v_user.user_id
                AND status = 'in_progress';

                -- Set first behavioral lesson to in_progress
                UPDATE public.user_lesson_progress
                SET status = 'in_progress'
                WHERE user_id = v_user.user_id
                AND lesson_id = v_first_behavioral_lesson_id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- 10. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_section_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_progress(UUID, certification_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_module_unlocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_unlocked_module(UUID, certification_type, exam_language) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_lesson_progress(UUID, certification_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lesson_unlocked(UUID, UUID) TO authenticated;
