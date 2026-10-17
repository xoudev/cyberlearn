-- certificates: the console revokes them, and puts a revoked one back.
--
-- A revocation tells the holder with a notice type of its own, on the site and
-- in the app. CERTIFICATE_ISSUED would have announced the opposite of what
-- happened, under the same mark as the day it was earned.
--
-- The app now lists a holder's revoked certificates with their reason, as the
-- site's /certificates page already did. It reads them through the Data API,
-- and 20260725000000_rls_column_hardening granted back every column the app
-- read then, which did not include the reason. The reason is no secret from
-- the holder: /verify/[publicId] prints it to anyone who has the address. The
-- row policy (certificates_select_self) keeps the grant to the holder's own
-- rows.
--
-- No table and no policy: one enum value, one column grant.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_REVOKED';

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to grant.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'GRANT SELECT ("revokedReason") ON public.certificates TO authenticated';
END
$$;
