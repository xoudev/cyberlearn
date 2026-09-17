-- A class being handed a path is its own kind of news.
--
-- It could have reused LESSON_ASSIGNED, and the bell would have shown the right
-- words either way - the title and body are written by the caller. But the type
-- is what any later filter, count or preference would key off, and a learner
-- who wanted to mute one kind and not the other would have had no way to say
-- which. Cheaper to add the value now than to split it once rows exist.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PATH_ASSIGNED';
