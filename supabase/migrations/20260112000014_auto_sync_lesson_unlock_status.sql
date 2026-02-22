-- Auto-sync lesson unlock status
-- Date: 2026-01-12
-- Description: Automatically update lesson status when related lessons complete
--              This prevents desync between is_lesson_unlocked() and status field

-- =============================================================================
-- Create function to unlock next lessons when a lesson completes
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

        -- If next lesson exists, check if it should be unlocked
        IF v_next_lesson_id IS NOT NULL THEN
            -- Check if next lesson should be unlocked
            v_is_unlocked := public.is_lesson_unlocked(NEW.user_id, v_next_lesson_id);

            -- Update next lesson status if it should be unlocked
            IF v_is_unlocked THEN
                UPDATE public.user_lesson_progress
                SET status = 'in_progress',
                    updated_at = NOW()
                WHERE user_id = NEW.user_id
                AND lesson_id = v_next_lesson_id
                AND status = 'locked';

                RAISE NOTICE 'Unlocked next lesson: %', v_next_lesson_id;
            END IF;
        ELSE
            -- No more lessons in this module, check if next module should unlock
            DECLARE
                v_module_record RECORD;
                v_next_module_id UUID;
                v_next_module_first_lesson_id UUID;
            BEGIN
                -- Get current module details
                SELECT * INTO v_module_record
                FROM public.curriculum_modules
                WHERE id = v_module_id;

                -- Find next module in sequence
                IF v_module_record.section_type = 'behavioral' THEN
                    -- Next behavioral module
                    SELECT id INTO v_next_module_id
                    FROM public.curriculum_modules
                    WHERE certification_type = v_module_record.certification_type
                    AND section_type = 'behavioral'
                    AND is_published = true
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
                    AND order_index > v_module_record.order_index
                    ORDER BY order_index
                    LIMIT 1;
                END IF;

                -- If next module found, unlock its first lesson if conditions met
                IF v_next_module_id IS NOT NULL THEN
                    -- Get first lesson of next module
                    SELECT id INTO v_next_module_first_lesson_id
                    FROM public.curriculum_lessons
                    WHERE module_id = v_next_module_id
                    AND is_published = true
                    ORDER BY order_index
                    LIMIT 1;

                    IF v_next_module_first_lesson_id IS NOT NULL THEN
                        -- Check if it should be unlocked
                        v_is_unlocked := public.is_lesson_unlocked(NEW.user_id, v_next_module_first_lesson_id);

                        IF v_is_unlocked THEN
                            UPDATE public.user_lesson_progress
                            SET status = 'in_progress',
                                updated_at = NOW()
                            WHERE user_id = NEW.user_id
                            AND lesson_id = v_next_module_first_lesson_id
                            AND status = 'locked';

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
-- Create trigger to auto-unlock lessons
-- =============================================================================

DROP TRIGGER IF EXISTS auto_unlock_next_lessons_trigger ON public.user_lesson_progress;

CREATE TRIGGER auto_unlock_next_lessons_trigger
    AFTER UPDATE ON public.user_lesson_progress
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION public.unlock_next_lessons();

-- =============================================================================
-- Create function to sync all lesson statuses for a user
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_lesson_unlock_status(
    p_user_id UUID,
    p_certification_type certification_type DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_lesson RECORD;
    v_is_unlocked BOOLEAN;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all lessons for the user
    FOR v_lesson IN
        SELECT ulp.lesson_id, ulp.status
        FROM public.user_lesson_progress ulp
        JOIN public.curriculum_lessons l ON l.id = ulp.lesson_id
        JOIN public.curriculum_modules m ON m.id = l.module_id
        WHERE ulp.user_id = p_user_id
        AND (p_certification_type IS NULL OR m.certification_type = p_certification_type)
        AND ulp.status = 'locked'
    LOOP
        -- Check if lesson should be unlocked
        v_is_unlocked := public.is_lesson_unlocked(p_user_id, v_lesson.lesson_id);

        -- Update if status is out of sync
        IF v_is_unlocked AND v_lesson.status = 'locked' THEN
            UPDATE public.user_lesson_progress
            SET status = 'in_progress',
                updated_at = NOW()
            WHERE user_id = p_user_id
            AND lesson_id = v_lesson.lesson_id;

            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.unlock_next_lessons() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_lesson_unlock_status(UUID, certification_type) TO authenticated;

-- =============================================================================
-- Sync all existing users' lesson statuses
-- =============================================================================

DO $$
DECLARE
    v_user RECORD;
    v_synced_count INTEGER;
BEGIN
    FOR v_user IN
        SELECT DISTINCT user_id
        FROM public.user_lesson_progress
    LOOP
        v_synced_count := public.sync_lesson_unlock_status(v_user.user_id);

        IF v_synced_count > 0 THEN
            RAISE NOTICE 'Synced % lessons for user %', v_synced_count, v_user.user_id;
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Success message
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Created auto-unlock trigger for lessons';
    RAISE NOTICE '✅ Created sync_lesson_unlock_status() function';
    RAISE NOTICE '✅ Synced all existing users lesson statuses';
    RAISE NOTICE '📖 Lessons will now automatically unlock when previous lesson completes';
END $$;
