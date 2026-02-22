-- Comprehensive module reordering fix
-- Date: 2026-01-12
-- Description: Thoroughly fix module ordering per language
--              Handles all edge cases and ensures proper isolation

-- =============================================================================
-- First, let's see what we're working with
-- =============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_en_count INTEGER;
    v_ar_count INTEGER;
    v_null_count INTEGER;
    v_max_order INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.curriculum_modules;
    SELECT COUNT(*) INTO v_en_count FROM public.curriculum_modules WHERE exam_language = 'en';
    SELECT COUNT(*) INTO v_ar_count FROM public.curriculum_modules WHERE exam_language = 'ar';
    SELECT COUNT(*) INTO v_null_count FROM public.curriculum_modules WHERE exam_language IS NULL;
    SELECT MAX(order_index) INTO v_max_order FROM public.curriculum_modules;

    RAISE NOTICE '=== BEFORE FIX ===';
    RAISE NOTICE 'Total modules: %', v_total;
    RAISE NOTICE 'English modules: %', v_en_count;
    RAISE NOTICE 'Arabic modules: %', v_ar_count;
    RAISE NOTICE 'Modules without language: %', v_null_count;
    RAISE NOTICE 'Max order_index: %', v_max_order;
END;
$$;

-- =============================================================================
-- Fix any modules with NULL exam_language (default to 'en')
-- =============================================================================

UPDATE public.curriculum_modules
SET exam_language = 'en'
WHERE exam_language IS NULL;

-- =============================================================================
-- Completely reorder ALL modules per language
-- Use a three-phase approach to avoid any constraint conflicts
-- =============================================================================

DO $$
DECLARE
    v_module RECORD;
    v_new_index INTEGER;
    v_counter INTEGER := 0;
BEGIN
    -- Phase 1: Set all order_index to very high unique values to clear the space
    FOR v_module IN SELECT id FROM public.curriculum_modules ORDER BY id
    LOOP
        v_counter := v_counter + 1;
        UPDATE public.curriculum_modules
        SET order_index = 10000 + v_counter
        WHERE id = v_module.id;
    END LOOP;

    RAISE NOTICE 'Phase 1: Shifted all % modules to high order_index values', v_counter;

    -- Phase 2: Reindex English modules (1 -> N)
    v_new_index := 0;
    FOR v_module IN
        SELECT id, competency_name, section_type
        FROM public.curriculum_modules
        WHERE exam_language = 'en'
        ORDER BY
            certification_type,
            CASE section_type WHEN 'behavioral' THEN 1 ELSE 2 END,
            order_index
    LOOP
        v_new_index := v_new_index + 1;
        UPDATE public.curriculum_modules
        SET order_index = v_new_index
        WHERE id = v_module.id;

        RAISE NOTICE 'EN Module % -> order %', v_module.competency_name, v_new_index;
    END LOOP;

    RAISE NOTICE 'Phase 2: Reindexed % English modules', v_new_index;

    -- Phase 3: Reindex Arabic modules (1 -> N) - independent ordering
    v_new_index := 0;
    FOR v_module IN
        SELECT id, competency_name, competency_name_ar, section_type
        FROM public.curriculum_modules
        WHERE exam_language = 'ar'
        ORDER BY
            certification_type,
            CASE section_type WHEN 'behavioral' THEN 1 ELSE 2 END,
            order_index
    LOOP
        v_new_index := v_new_index + 1;
        UPDATE public.curriculum_modules
        SET order_index = v_new_index
        WHERE id = v_module.id;

        RAISE NOTICE 'AR Module % -> order %', COALESCE(v_module.competency_name_ar, v_module.competency_name), v_new_index;
    END LOOP;

    RAISE NOTICE 'Phase 3: Reindexed % Arabic modules', v_new_index;
END;
$$;

-- =============================================================================
-- Fix prerequisites to be within same language
-- =============================================================================

-- Clear all prerequisites first
UPDATE public.curriculum_modules
SET prerequisite_module_id = NULL;

-- Set prerequisites within each language
DO $$
DECLARE
    v_module RECORD;
    v_prev_module_id UUID;
    v_prev_order INTEGER;
BEGIN
    FOR v_module IN
        SELECT
            id,
            competency_name,
            competency_name_ar,
            certification_type,
            section_type,
            exam_language,
            order_index
        FROM public.curriculum_modules
        ORDER BY
            exam_language,
            certification_type,
            CASE section_type WHEN 'behavioral' THEN 1 ELSE 2 END,
            order_index
    LOOP
        v_prev_module_id := NULL;

        -- Find previous module in same language/cert/section
        SELECT id INTO v_prev_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = v_module.section_type
        AND exam_language = v_module.exam_language
        AND order_index = v_module.order_index - 1;

        -- If first in knowledge_based, link to last behavioral
        IF v_prev_module_id IS NULL
           AND v_module.section_type = 'knowledge_based'
           AND v_module.order_index = 1 THEN
            SELECT id INTO v_prev_module_id
            FROM public.curriculum_modules
            WHERE certification_type = v_module.certification_type
            AND section_type = 'behavioral'
            AND exam_language = v_module.exam_language
            ORDER BY order_index DESC
            LIMIT 1;
        END IF;

        -- Update prerequisite
        IF v_prev_module_id IS NOT NULL THEN
            UPDATE public.curriculum_modules
            SET prerequisite_module_id = v_prev_module_id
            WHERE id = v_module.id;

            RAISE NOTICE 'Set prerequisite for % (% order %) to previous module',
                COALESCE(v_module.competency_name_ar, v_module.competency_name),
                v_module.exam_language,
                v_module.order_index;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Final verification
-- =============================================================================

DO $$
DECLARE
    v_rec RECORD;
    v_en_count INTEGER;
    v_ar_count INTEGER;
    v_cross_lang INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== AFTER FIX ===';

    -- Count per language
    SELECT COUNT(*) INTO v_en_count FROM public.curriculum_modules WHERE exam_language = 'en';
    SELECT COUNT(*) INTO v_ar_count FROM public.curriculum_modules WHERE exam_language = 'ar';

    RAISE NOTICE 'English modules: %', v_en_count;
    RAISE NOTICE 'Arabic modules: %', v_ar_count;

    -- Show English ordering
    RAISE NOTICE '';
    RAISE NOTICE '--- English Modules ---';
    FOR v_rec IN
        SELECT order_index, competency_name, section_type
        FROM public.curriculum_modules
        WHERE exam_language = 'en'
        ORDER BY order_index
    LOOP
        RAISE NOTICE '  % - % (%)', v_rec.order_index, v_rec.competency_name, v_rec.section_type;
    END LOOP;

    -- Show Arabic ordering
    RAISE NOTICE '';
    RAISE NOTICE '--- Arabic Modules ---';
    FOR v_rec IN
        SELECT order_index, competency_name, competency_name_ar, section_type
        FROM public.curriculum_modules
        WHERE exam_language = 'ar'
        ORDER BY order_index
    LOOP
        RAISE NOTICE '  % - % (%)', v_rec.order_index, COALESCE(v_rec.competency_name_ar, v_rec.competency_name), v_rec.section_type;
    END LOOP;

    -- Check for cross-language prerequisites
    SELECT COUNT(*) INTO v_cross_lang
    FROM public.curriculum_modules cm1
    JOIN public.curriculum_modules cm2 ON cm1.prerequisite_module_id = cm2.id
    WHERE cm1.exam_language != cm2.exam_language;

    IF v_cross_lang > 0 THEN
        RAISE WARNING '⚠️ Found % cross-language prerequisite links!', v_cross_lang;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ No cross-language prerequisite links';
    END IF;

    RAISE NOTICE '✅ Module ordering complete - each language has independent 1-N ordering';
END;
$$;
