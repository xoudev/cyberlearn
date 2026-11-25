-- The bell counts new notifications live (Supabase Realtime, postgres_changes
-- on notifications, components/notification-panel.tsx), and no migration had
-- ever added the table to the publication: wherever it was not added by hand,
-- nothing was ever pushed. The policy notifications_self_all lets a subscriber
-- receive its own rows only.
--
-- Guarded twice: only where the publication exists (a bare Postgres, CI's
-- schema check, has no Realtime), and only when the table is not in it
-- already (a project where it was added from the dashboard).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
