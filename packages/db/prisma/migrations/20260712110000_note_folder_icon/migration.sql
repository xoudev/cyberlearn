-- Add an optional icon to note folders (picked from a fixed client set; NULL is
-- rendered as the default "folder" glyph). No RLS change: the existing
-- note_folders policies already cover every column of the table.
ALTER TABLE "note_folders" ADD COLUMN "icon" TEXT;
