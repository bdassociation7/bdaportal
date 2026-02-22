-- Migration: Fix get_next_unlocked_module to filter by language
-- Date: 2025-12-31
-- Description: Update get_next_unlocked_module function to support language filtering
-- This replaces the old function signature with one that has an optional language parameter

-- =============================================================================
-- DROP OLD FUNCTION SIGNATURE (without language parameter)
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_next_unlocked_module(UUID, certification_type);

-- =============================================================================
-- CREATE/REPLACE get_next_unlocked_module FUNCTION
-- With optional exam_language parameter
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_unlocked_module(
    p_user_id UUID,
    p_certification_type certification_type,
    p_exam_language exam_language DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_next_module_id UUID;
BEGIN
    -- Find first incomplete module in order, optionally filtered by language
    SELECT cm.id INTO v_next_module_id
    FROM public.curriculum_modules cm
    LEFT JOIN public.user_curriculum_progress ucp
        ON cm.id = ucp.module_id AND ucp.user_id = p_user_id
    WHERE cm.certification_type = p_certification_type
        AND cm.is_published = true
        AND (ucp.status IS NULL OR ucp.status != 'completed')
        AND public.is_module_unlocked(p_user_id, cm.id) = true
        -- Only filter by language if parameter is provided
        AND (p_exam_language IS NULL OR cm.exam_language = p_exam_language)
    ORDER BY cm.order_index
    LIMIT 1;

    RETURN v_next_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_next_unlocked_module(UUID, certification_type, exam_language) IS
    'Returns the next unlocked module for a user. Optional exam_language parameter filters by language.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT '✅ get_next_unlocked_module updated with language filter!' as status;
