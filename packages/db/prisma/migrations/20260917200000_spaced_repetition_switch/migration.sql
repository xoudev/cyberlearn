-- Turning revisions off, feature and all.
--
-- reviewReminders already existed and governed one e-mail. What it could not do
-- is stop the feature: the queue kept filling, the sidebar kept its entry and
-- the dashboard kept a section about work nobody wanted. This is the switch
-- above it.
--
-- Defaults to true, so nothing changes for anyone who has not asked.
ALTER TABLE "user_preferences" ADD COLUMN "spacedRepetition" BOOLEAN NOT NULL DEFAULT true;
