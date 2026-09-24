-- What a learner came for, and where they start from.
--
-- Answered in the onboarding questionnaire (and again from "Trouver mon
-- parcours"), and used only to suggest paths. The table's policies already
-- restrict a row to its owner; the answers are written by the server.
ALTER TABLE "user_preferences" ADD COLUMN "learningGoals" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "user_preferences" ADD COLUMN "startingLevel" TEXT;
