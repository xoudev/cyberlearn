-- Who took a piece of content down, and when a report was filed.
--
-- forum_posts: a message hidden by its author ("Retirer", on the site and in
-- the app) and one hidden by the moderation looked the same, so the console
-- offered to show again a message its author had withdrawn, and the whole
-- thread with it when that message opened it. The console now shows again
-- only what the moderation hid. False by default, so every message hidden
-- before this column existed counts as its author's: none of them can be put
-- back from the console.
--
-- challenge_writeups: publishing again wrote isHidden from the screen alone,
-- so a solution the console had hidden came back with its author's next
-- click. One the moderation hid is now never written over by its author.
--
-- content_reports: the hourly limit on reports counted updatedAt, which moves
-- when the console closes a report, so a moderator closing a learner's old
-- reports used up that learner's limit. reportedAt is written by the reporter
-- alone.
--
-- No table and no policy: three columns on tables whose row level security
-- and grants are unchanged. challenge_writeups and content_reports grant
-- SELECT on the whole table, which covers a new column.

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN     "hiddenByModeration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "challenge_writeups" ADD COLUMN     "hiddenByModeration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "content_reports" ADD COLUMN     "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
