-- Migration: Fix first behavioral module access for all users
-- Ensures the first behavioral module in each language is always unlocked

-- =============================================================================
-- 1. Update is_module_unlocked to ALWAYS return true for first behavioral module
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_module_unlocked(
    p_user_id UUID,
    p_module_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_module RECORD;
    v_previous_module_id UUID;
    v_previous_status TEXT;
    v_is_first_behavioral BOOLEAN;
BEGIN
    -- Get current module details
    SELECT id, order_index, section_type, certification_type, prerequisite_module_id, exam_language
    INTO v_module
    FROM public.curriculum_modules
    WHERE id = p_module_id;

    IF v_module IS NULL THEN
        RETURN FALSE;
    END IF;

    -- If module has explicit prerequisite, check that first
    IF v_module.prerequisite_module_id IS NOT NULL THEN
        SELECT status INTO v_previous_status
        FROM public.user_curriculum_progress
        WHERE user_id = p_user_id AND module_id = v_module.prerequisite_module_id;

        RETURN COALESCE(v_previous_status = 'completed', FALSE);
    END IF;

    -- Check if this is THE FIRST behavioral module (per language)
    -- ALWAYS unlocked regardless of user progress
    IF v_module.section_type = 'behavioral' THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM public.curriculum_modules
            WHERE certification_type = v_module.certification_type
            AND section_type = 'behavioral'
            AND exam_language = v_module.exam_language
            AND is_published = true
            AND order_index < v_module.order_index
        ) INTO v_is_first_behavioral;

        IF v_is_first_behavioral THEN
            RETURN TRUE;  -- First behavioral is ALWAYS unlocked
        END IF;

        -- Otherwise, check if previous behavioral module is completed
        SELECT id INTO v_previous_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = 'behavioral'
        AND exam_language = v_module.exam_language
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
            AND exam_language = v_module.exam_language
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
                AND m.exam_language = v_module.exam_language
                AND m.is_published = true
                AND COALESCE(p.status, 'locked') != 'completed'
            );
        END IF;

        -- Otherwise, check if previous knowledge module is completed
        SELECT id INTO v_previous_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = 'knowledge_based'
        AND exam_language = v_module.exam_language
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
-- 2. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.is_module_unlocked(UUID, UUID) TO authenticated;
