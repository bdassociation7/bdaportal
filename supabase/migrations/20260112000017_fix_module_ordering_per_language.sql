-- Fix module ordering to be independent per language
-- Date: 2026-01-12
-- Description: Each language (EN/AR) should have its own 1-14 ordering
--              Currently Arabic modules might continue numbering after English

-- =============================================================================
-- First, drop the old unique constraint that doesn't include exam_language
-- Then create a new one that allows same order_index for different languages
-- =============================================================================

-- Drop the old constraint (if exists)
ALTER TABLE public.curriculum_modules
    DROP CONSTRAINT IF EXISTS curriculum_modules_order_cert_unique;

-- Create new constraint that includes exam_language (if not exists)
-- This allows EN Module 1 and AR Module 1 to coexist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'curriculum_modules_order_cert_lang_unique'
    ) THEN
        ALTER TABLE public.curriculum_modules
            ADD CONSTRAINT curriculum_modules_order_cert_lang_unique
            UNIQUE (order_index, certification_type, exam_language);
    END IF;
END $$;

-- =============================================================================
-- Two-phase reindex: First shift Arabic modules to high values, then reindex
-- This avoids unique constraint violations during reindexing
-- =============================================================================

DO $$
DECLARE
    v_module RECORD;
    v_new_index INTEGER;
    v_offset INTEGER := 1000; -- Temporary offset to avoid conflicts
BEGIN
    -- Phase 1: Shift all Arabic modules to temporary high order_index values
    UPDATE public.curriculum_modules
    SET order_index = order_index + v_offset
    WHERE exam_language = 'ar';

    RAISE NOTICE 'Phase 1: Shifted Arabic modules to high order_index values';

    -- Phase 2: Reindex Arabic modules starting from 1
    -- Process behavioral first, then knowledge_based
    FOR v_module IN
        SELECT id, competency_name, certification_type, section_type, order_index
        FROM public.curriculum_modules
        WHERE exam_language = 'ar'
        ORDER BY
            certification_type,
            CASE section_type WHEN 'behavioral' THEN 1 ELSE 2 END,
            order_index
    LOOP
        -- Calculate new index within (cert_type, section_type, language)
        SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_new_index
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = v_module.section_type
        AND exam_language = 'ar'
        AND order_index < v_offset; -- Only count already-reindexed modules

        UPDATE public.curriculum_modules
        SET order_index = v_new_index
        WHERE id = v_module.id;

        RAISE NOTICE 'Reindexed Arabic module: % -> order %', v_module.competency_name, v_new_index;
    END LOOP;

    RAISE NOTICE 'Phase 2: Reindexed Arabic modules starting from 1';
END;
$$;

-- =============================================================================
-- Update prerequisite_module_id to ensure they point to same-language modules
-- =============================================================================

-- First, clear any cross-language prerequisite links
UPDATE public.curriculum_modules cm1
SET prerequisite_module_id = NULL
WHERE prerequisite_module_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.curriculum_modules cm2
    WHERE cm2.id = cm1.prerequisite_module_id
    AND cm2.exam_language != cm1.exam_language
);

-- Now set proper prerequisites within same language
-- Each module should have prerequisite = previous module in same language/section
DO $$
DECLARE
    v_module RECORD;
    v_prev_module_id UUID;
BEGIN
    FOR v_module IN
        SELECT
            cm.id,
            cm.certification_type,
            cm.section_type,
            cm.exam_language,
            cm.order_index,
            cm.competency_name
        FROM public.curriculum_modules cm
        ORDER BY
            cm.certification_type,
            cm.exam_language,
            CASE cm.section_type WHEN 'behavioral' THEN 1 ELSE 2 END,
            cm.order_index
    LOOP
        -- Find previous module in same cert/section/language
        SELECT id INTO v_prev_module_id
        FROM public.curriculum_modules
        WHERE certification_type = v_module.certification_type
        AND section_type = v_module.section_type
        AND exam_language = v_module.exam_language
        AND order_index = v_module.order_index - 1;

        -- If this is the first in knowledge_based section, link to last behavioral
        IF v_prev_module_id IS NULL AND v_module.section_type = 'knowledge_based' AND v_module.order_index = 1 THEN
            SELECT id INTO v_prev_module_id
            FROM public.curriculum_modules
            WHERE certification_type = v_module.certification_type
            AND section_type = 'behavioral'
            AND exam_language = v_module.exam_language
            ORDER BY order_index DESC
            LIMIT 1;
        END IF;

        -- Update the prerequisite
        UPDATE public.curriculum_modules
        SET prerequisite_module_id = v_prev_module_id
        WHERE id = v_module.id;

        IF v_prev_module_id IS NOT NULL THEN
            RAISE NOTICE 'Set prerequisite for % (%) to previous module',
                v_module.competency_name,
                v_module.exam_language;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Verify the ordering
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count modules per language
    SELECT COUNT(*) INTO v_count
    FROM public.curriculum_modules
    WHERE exam_language = 'en';
    RAISE NOTICE '✅ English modules: %', v_count;

    SELECT COUNT(*) INTO v_count
    FROM public.curriculum_modules
    WHERE exam_language = 'ar';
    RAISE NOTICE '✅ Arabic modules: %', v_count;

    -- Verify no cross-language prerequisites
    SELECT COUNT(*) INTO v_count
    FROM public.curriculum_modules cm1
    JOIN public.curriculum_modules cm2 ON cm1.prerequisite_module_id = cm2.id
    WHERE cm1.exam_language != cm2.exam_language;

    IF v_count > 0 THEN
        RAISE WARNING '⚠️ Found % cross-language prerequisite links', v_count;
    ELSE
        RAISE NOTICE '✅ No cross-language prerequisite links';
    END IF;

    RAISE NOTICE '✅ Module ordering fixed - each language now has independent 1-N ordering';
END;
$$;
