drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_user_to_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
      -- Only process ECP and PDP roles
      IF NEW.role IN ('ecp', 'pdp') THEN
          -- Upsert into partners table
          INSERT INTO partners (
              id,
              partner_type,
              company_name,
              contact_email,
              contact_person,
              contact_phone,
              country,
              is_active,
              created_at,
              updated_at
          ) VALUES (
              NEW.id,
              NEW.role::text,  -- 'ecp' or 'pdp'
              COALESCE(NEW.company_name, NEW.first_name || ' ' || NEW.last_name),
              NEW.email,
              NEW.first_name || ' ' || NEW.last_name,
              NEW.phone,
              NEW.country_code,
              NEW.is_active,
              NEW.created_at,
              NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
              company_name = COALESCE(EXCLUDED.company_name, partners.company_name),
              contact_email = EXCLUDED.contact_email,
              contact_person = EXCLUDED.contact_person,
              contact_phone = EXCLUDED.contact_phone,
              country = EXCLUDED.country,
              is_active = EXCLUDED.is_active,
              updated_at = NOW();
      END IF;

      -- If role changed FROM ecp/pdp to something else, deactivate the partner
      IF OLD.role IN ('ecp', 'pdp') AND NEW.role NOT IN ('ecp', 'pdp') THEN
          UPDATE partners SET is_active = false, updated_at = NOW() WHERE id = NEW.id;
      END IF;

      RETURN NEW;
  EXCEPTION
      WHEN OTHERS THEN
          RAISE WARNING 'Failed to sync user to partners: % - %', SQLERRM, SQLSTATE;
          RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.create_default_user_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
      -- Create notification settings with all enabled by default
      INSERT INTO user_notification_settings (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;

      -- Create user preferences with defaults
      INSERT INTO user_preferences (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;

      RETURN NEW;
  EXCEPTION
      WHEN OTHERS THEN
          -- Log the error but don't fail the auth.users insert
          RAISE WARNING 'Failed to create user settings: % - %', SQLERRM, SQLSTATE;
          RETURN NEW;
  END;
  $function$
;

CREATE TRIGGER sync_user_partner AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_partner();


