-- lesson_answers, challenge_writeups: an index led by the author, for the
-- contributions a public profile counts.
--
-- profileRepository.contributionsOf counts somebody's answers under lessons
-- and their challenge solutions. Neither table had an index whose leading
-- column is the author: lesson_answers is indexed by question, and
-- challenge_writeups' unique key starts with the challenge. Each count read
-- the whole table. forum_topics and forum_posts already have theirs.
--
-- Index only: no column, no table, no policy changes.

-- CreateIndex
CREATE INDEX "lesson_answers_userId_idx" ON "lesson_answers"("userId");

-- CreateIndex
CREATE INDEX "challenge_writeups_userId_idx" ON "challenge_writeups"("userId");
