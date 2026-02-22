-- Fix lesson unlock order to ensure module completion is checked first
-- Date: 2026-01-12
-- Description: Update unlock_next_lessons to check module completion before unlocking
--              This fixes the race condition between triggers

-- =============================================================================
-- Update the unlock_next_lessons function to ensure module is completed first
-- =============================================================================

CREATE OR REPLACE FUNCTION public.unlock_next_lessons()
RETURNS TRIGGER AS $$
DECLARE
    v_module_id UUID;
    v_lesson_order INTEGER;
    v_next_lesson_id UUID;
    v_is_unlocked BOOLEAN;
BEGIN
    -- Only proceed if lesson was just completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get the module and order of the completed lesson
        SELECT module_id, order_index
        INTO v_module_id, v_lesson_order
        FROM public.curriculum_lessons
        WHERE id = NEW.lesson_id;

        -- Get the next lesson in this module
        SELECT id INTO v_next_lesson_id
        FROM public.curriculum_lessons
        WHERE module_id = v_module_id
        AND order_index = v_lesson_order + 1
        AND is_published = true;

        -- If next lesson exists in this module, unlock it
        IF v_next_lesson_id IS NOT NULL THEN
            -- Update next lesson status if it's currently locked
            UPDATE public.user_lesson_progress
            SET status = 'in_progress',
                updated_at = NOW()
            WHERE user_id = NEW.user_id
            AND lesson_id = v_next_lesson_id
            AND status = 'locked';

            -- If no record exists, create one
            INSERT INTO public.user_lesson_progress (user_id, lesson_id, status, progress_percentage)
            VALUES (NEW.user_id, v_next_lesson_id, 'in_progress', 0)
            ON CONFLICT (user_id, lesson_id) DO NOTHING;

            RAISE NOTICE 'Unlocked next lesson: %', v_next_lesson_id;
        ELSE
            -- No more lessons in this module
            -- First, ensure module completion is recorded
            PERFORM public.check_module_completion(NEW.user_id, v_module_id);

            -- Now check if next module should unlock
            DECLARE
                v_module_record RECORD;
                v_next_module_id UUID;
                v_next_module_first_lesson_id UUID;
                v_is_next_module_unlocked BOOLEAN;
            BEGIN
                -- Get current module details
                SELECT * INTO v_module_record
                FROM public.curriculum_modules
                WHERE id = v_module_id;

                -- Find next module in sequence (by order_index within same cert type and section)
                IF v_module_record.section_type = 'behavioral' THEN
                    -- Next behavioral module
                    SELECT id INTO v_next_module_id
                    FROM public.curriculum_modules
                    WHERE certification_type = v_module_record.certification_type
                    AND section_type = 'behavioral'
                    AND is_published = true
                    AND exam_language = v_module_record.exam_language
                    AND order_index > v_module_record.order_index
                    ORDER BY order_index
                    LIMIT 1;

                    -- If no more behavioral, get first knowledge-based
                    IF v_next_module_id IS NULL THEN
                        SELECT id INTO v_next_module_id
                        FROM public.curriculum_modules
                        WHERE certification_type = v_module_record.certification_type
                        AND section_type = 'knowledge_based'
                        AND is_published = true
                        AND exam_language = v_module_record.exam_language
                        ORDER BY order_index
                        LIMIT 1;
                    END IF;
                ELSE
                    -- Next knowledge-based module
                    SELECT id INTO v_next_module_id
                    FROM public.curriculum_modules
                    WHERE certification_type = v_module_record.certification_type
                    AND section_type = 'knowledge_based'
                    AND is_published = true
                    AND exam_language = v_module_record.exam_language
                    AND order_index > v_module_record.order_index
                    ORDER BY order_index
                    LIMIT 1;
                END IF;

                -- If next module found, unlock its first lesson
                IF v_next_module_id IS NOT NULL THEN
                    -- Verify module is actually unlocked now
                    v_is_next_module_unlocked := public.is_module_unlocked(NEW.user_id, v_next_module_id);

                    IF v_is_next_module_unlocked THEN
                        -- Get first lesson of next module
                        SELECT id INTO v_next_module_first_lesson_id
                        FROM public.curriculum_lessons
                        WHERE module_id = v_next_module_id
                        AND is_published = true
                        ORDER BY order_index
                        LIMIT 1;

                        IF v_next_module_first_lesson_id IS NOT NULL THEN
                            -- Update or create progress record for first lesson of next module
                            UPDATE public.user_lesson_progress
                            SET status = 'in_progress',
                                updated_at = NOW()
                            WHERE user_id = NEW.user_id
                            AND lesson_id = v_next_module_first_lesson_id
                            AND status = 'locked';

                            -- If no record exists, create one
                            INSERT INTO public.user_lesson_progress (user_id, lesson_id, status, progress_percentage)
                            VALUES (NEW.user_id, v_next_module_first_lesson_id, 'in_progress', 0)
                            ON CONFLICT (user_id, lesson_id) DO NOTHING;

                            RAISE NOTICE 'Unlocked first lesson of next module: %', v_next_module_first_lesson_id;
                        END IF;
                    END IF;
                END IF;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Recreate the trigger (uses the updated function)
-- =============================================================================

DROP TRIGGER IF EXISTS auto_unlock_next_lessons_trigger ON public.user_lesson_progress;

CREATE TRIGGER auto_unlock_next_lessons_trigger
    AFTER UPDATE ON public.user_lesson_progress
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION public.unlock_next_lessons();

-- =============================================================================
-- Also create trigger for INSERT (when new completed record is created directly)
-- =============================================================================

DROP TRIGGER IF EXISTS auto_unlock_next_lessons_insert_trigger ON public.user_lesson_progress;

CREATE TRIGGER auto_unlock_next_lessons_insert_trigger
    AFTER INSERT ON public.user_lesson_progress
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.unlock_next_lessons();

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Updated unlock_next_lessons function with proper module completion check';
    RAISE NOTICE '✅ Trigger now ensures module is marked completed before unlocking next module';
    RAISE NOTICE '✅ Added INSERT trigger for direct completion records';
END $$;
