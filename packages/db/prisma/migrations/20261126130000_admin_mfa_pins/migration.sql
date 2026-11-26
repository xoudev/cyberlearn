-- The TOTP factors each administrator signs in to the console with, as the
-- console first saw them (apps/admin/lib/auth.ts). Supabase lets any aal2
-- session remove or add its own factors through the API, and the auth schema
-- takes no trigger of ours since April 2025 (its tables belong to
-- supabase_auth_admin): a stolen site session could swap the factor the
-- console asks for. A set that changes after it was pinned closes the console
-- until the recovery procedure clears it. docs/hardening/known-issues.md.

-- CreateTable
CREATE TABLE "admin_mfa_pins" (
    "userId" UUID NOT NULL,
    "factorId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_mfa_pins_pkey" PRIMARY KEY ("userId","factorId")
);

-- AddForeignKey
ALTER TABLE "admin_mfa_pins" ADD CONSTRAINT "admin_mfa_pins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SERVER-ONLY: the console reads and writes it through Prisma. RLS with zero
-- policies denies anon and authenticated everything, and the grants go too:
-- a client able to write here could pin a factor of its own.
ALTER TABLE "admin_mfa_pins" ENABLE ROW LEVEL SECURITY;
-- (intentionally no policy: RLS enabled with zero policies denies all client access)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.admin_mfa_pins FROM anon, authenticated';
END
$$;
