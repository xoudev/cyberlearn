-- challenges: the Linux machine a CTF challenge is played on.
--
-- The files the browser's machine is prepared with (as <LinuxTerminal> takes
-- them), one of them holding {{FLAG}}, where the server writes the learner's
-- own flag. No policy to add: challenges has RLS on and no policy at all
-- (20260610200000_rls_baseline), so no client reads any of its columns.

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "machine" JSONB;
