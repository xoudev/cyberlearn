-- The quest pool the weeks draw from (pickWeekQuests): several quests per
-- kind, at two levels. The five first quests stay, with their codes (progress
-- rows point at them); the streak of five days becomes the long streak quest,
-- and the forum quest says what it counts (a forum message or an answer under
-- a lesson). Idempotent: the inserts skip a code already there.

UPDATE "quests" SET "level" = 2 WHERE "code" = 'STREAK_5_DAYS';
UPDATE "quests"
  SET "title" = 'Publie un message d''entraide',
      "description" = 'Un sujet ou une réponse sur le forum, ou une réponse sous une leçon.'
  WHERE "code" = 'FORUM_WRITEUP';

INSERT INTO "quests" ("id", "code", "title", "description", "type", "target", "xpReward", "freezeReward", "level", "orderIndex", "isActive", "createdAt") VALUES
  (gen_random_uuid(), 'LESSONS_2', 'Termine 2 leçons', 'Complète 2 leçons cette semaine.', 'LESSON_COMPLETED', 2, 200, 0, 1, 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LESSONS_5', 'Termine 5 leçons', 'Complète 5 leçons cette semaine.', 'LESSON_COMPLETED', 5, 500, 0, 2, 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'STREAK_3_DAYS', 'Garde ta série 3 jours', 'Atteins une série de 3 jours.', 'STREAK_DAYS', 3, 250, 0, 1, 3, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CHALLENGE_1', 'Résous un défi', 'Trouve le flag d''un défi.', 'CHALLENGE_SOLVED', 1, 300, 0, 1, 6, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RECALL_2', 'Fais 2 rappels du jour', 'Termine le rappel du jour 2 jours cette semaine.', 'DAILY_RECALL', 2, 250, 0, 1, 7, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RECALL_5', 'Fais 5 rappels du jour', 'Termine le rappel du jour 5 jours cette semaine.', 'DAILY_RECALL', 5, 450, 0, 2, 7, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EXERCISES_2', 'Réussis 2 exercices', 'Termine 2 exercices pratiques dans les leçons : terminal, Python…', 'EXERCISE_PASSED', 2, 250, 0, 1, 8, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EXERCISES_5', 'Réussis 5 exercices', 'Termine 5 exercices pratiques dans les leçons : terminal, Python…', 'EXERCISE_PASSED', 5, 500, 0, 2, 8, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
