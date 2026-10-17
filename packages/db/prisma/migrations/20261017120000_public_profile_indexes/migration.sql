-- lesson_answers, challenge_writeups, user_badges: the indexes a public
-- profile's reads lean on.
--
-- profileRepository.contributionsOf counts somebody's answers under lessons
-- and their challenge solutions. Neither table had an index whose leading
-- column is the author: lesson_answers is indexed by question, and
-- challenge_writeups' unique key starts with the challenge. Each count read
-- the whole table. forum_topics and forum_posts already have theirs.
--
-- profileRepository.badgeCandidates counts how many people hold each of the
-- owner's rarest badges, grouping user_badges by badgeId. Its indexes all
-- start with userId (the unique key on userId, badgeId, and userId alone),
-- and Postgres does not index a foreign key by itself: every profile read
-- the whole table.
--
-- Index only: no column, no table, no policy changes.

-- CreateIndex
CREATE INDEX "lesson_answers_userId_idx" ON "lesson_answers"("userId");

-- CreateIndex
CREATE INDEX "challenge_writeups_userId_idx" ON "challenge_writeups"("userId");

-- CreateIndex
CREATE INDEX "user_badges_badgeId_idx" ON "user_badges"("badgeId");
