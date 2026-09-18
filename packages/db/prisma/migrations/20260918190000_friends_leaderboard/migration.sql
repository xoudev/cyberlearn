-- Opting in to being named on a friend's friends board.
--
-- Off for everybody, including existing rows: this is a new audience nobody has
-- agreed to yet, and a default of true would publish names to it on deploy.
ALTER TABLE "user_preferences"
  ADD COLUMN "friendsLeaderboard" BOOLEAN NOT NULL DEFAULT false;
