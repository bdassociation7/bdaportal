-- Establish the two operational recovery accounts as immutable Super Admins.
-- They cannot be deleted, disabled, demoted, or reassigned through portal actions.

UPDATE public.users
SET role = 'super_admin',
    is_active = true
WHERE lower(email) IN (
  'info@bda-global.org',
  'bdassociation7@gmail.com'
);

CREATE OR REPLACE FUNCTION public.protect_primary_super_admin_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_old boolean := TG_OP IN ('UPDATE', 'DELETE')
    AND lower(OLD.email) IN ('info@bda-global.org', 'bdassociation7@gmail.com');
  protected_new boolean := TG_OP IN ('INSERT', 'UPDATE')
    AND lower(NEW.email) IN ('info@bda-global.org', 'bdassociation7@gmail.com');
BEGIN
  -- A primary recovery account must never be removed from the portal.
  IF TG_OP = 'DELETE' AND protected_old THEN
    RAISE EXCEPTION 'Primary Super Admin accounts cannot be deleted.';
  END IF;

  -- If one of the protected addresses is created or updated, enforce its role.
  IF TG_OP IN ('INSERT', 'UPDATE') AND protected_new THEN
    NEW.email := lower(NEW.email);
    NEW.role := 'super_admin';
    NEW.is_active := true;
  END IF;

  -- Do not allow either protected account to be renamed into an unprotected address.
  IF TG_OP = 'UPDATE' AND protected_old THEN
    IF lower(NEW.email) IS DISTINCT FROM lower(OLD.email) THEN
      RAISE EXCEPTION 'Primary Super Admin email addresses cannot be changed.';
    END IF;
    NEW.role := 'super_admin';
    NEW.is_active := true;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS protect_primary_super_admin_accounts ON public.users;

CREATE TRIGGER protect_primary_super_admin_accounts
BEFORE INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_super_admin_accounts();
