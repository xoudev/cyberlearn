-- The first week's e-mails: day 1, day 3 and day 7 after sign-up
-- (apps/web/lib/onboarding/first-week.ts, run by /api/cron/onboarding-emails).
-- One row per account and step once it went out, so a step is never sent
-- twice, whatever the cron does.

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('FIRST_MISSION', 'COME_BACK', 'FIRST_WEEK');

-- CreateTable
CREATE TABLE "onboarding_emails" (
    "userId" UUID NOT NULL,
    "step" "OnboardingStep" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_emails_pkey" PRIMARY KEY ("userId","step")
);

-- AddForeignKey
ALTER TABLE "onboarding_emails" ADD CONSTRAINT "onboarding_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SERVER-ONLY, as quiz_questions in the baseline: the cron writes and reads it
-- through Prisma, no client has a use for it. RLS with zero policies denies
-- anon and authenticated everything, and the grants go too.
ALTER TABLE "onboarding_emails" ENABLE ROW LEVEL SECURITY;
-- (intentionally no policy: RLS enabled with zero policies denies all client access)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.onboarding_emails FROM anon, authenticated';
END
$$;
