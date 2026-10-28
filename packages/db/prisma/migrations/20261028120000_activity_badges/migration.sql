-- Twelve badges for what is played outside lessons, on the criteria added by
-- 20261027170000_badge_activity_criteria: challenges, duels, tournaments and
-- the daily recall. Their icons are served by the site (/badges/*.svg).
-- They pay no XP, as the first ten do; the console sets a reward per badge.
-- Learners who already meet a criterion get the badge, silently, the next
-- time their collection is read. Idempotent: a badge whose code or name is
-- already taken is skipped rather than failing the deploy.

INSERT INTO "badges" ("id", "refCode", "name", "description", "iconUrl", "rarity", "criterionType", "criterionData", "xpReward", "isActive", "createdAt") VALUES
  (gen_random_uuid(), 'CL-BDG-011', 'Premier flag', 'Résous ton premier défi.', '/badges/first-flag.svg', 'COMMON', 'CHALLENGES_SOLVED', '{"count":1}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-012', 'Chasseur de flags', 'Résous 10 défis.', '/badges/flag-hunter.svg', 'RARE', 'CHALLENGES_SOLVED', '{"count":10}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-013', 'Sans filet', 'Résous un défi sans révéler un seul de ses indices.', '/badges/no-hints.svg', 'RARE', 'CHALLENGES_SOLVED', '{"count":1,"only":"WITHOUT_HINTS"}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-014', 'Rendez-vous hebdo', 'Résous 3 défis de la semaine, chacun pendant sa semaine.', '/badges/weekly-challenge.svg', 'EPIC', 'CHALLENGES_SOLVED', '{"count":3,"only":"WEEKLY"}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-015', 'Premier duel', 'Va au bout de ton premier duel, quel qu''en soit le résultat.', '/badges/first-duel.svg', 'COMMON', 'DUELS_PLAYED', '{"count":1}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-016', 'Duelliste', 'Gagne 10 duels.', '/badges/duelist.svg', 'RARE', 'DUELS_WON', '{"count":10}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-017', 'Imbattable', 'Gagne 25 duels.', '/badges/unbeatable.svg', 'EPIC', 'DUELS_WON', '{"count":25}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-018', 'Sur la ligne de départ', 'Valide un flag pendant un tournoi.', '/badges/starting-line.svg', 'RARE', 'TOURNAMENTS_PLAYED', '{"count":1}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-019', 'Podium', 'Termine un tournoi avec ton équipe parmi les trois premières.', '/badges/podium.svg', 'EPIC', 'TOURNAMENT_RANK', '{"top":3,"count":1}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-020', 'Champion', 'Remporte un tournoi avec ton équipe.', '/badges/champion.svg', 'LEGENDARY', 'TOURNAMENT_RANK', '{"top":1,"count":1}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-021', 'Mémoire vive', 'Fais 7 rappels du jour.', '/badges/recall-7.svg', 'COMMON', 'DAILY_RECALLS', '{"count":7}'::jsonb, 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CL-BDG-022', 'Mémoire d''éléphant', 'Fais 30 rappels du jour.', '/badges/recall-30.svg', 'RARE', 'DAILY_RECALLS', '{"count":30}'::jsonb, 0, true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
