-- Cosmetic names after the Bastion redesign (data only, no schema change).
--
-- The default accent kept the name "Turquoise" while it draws copper, and the
-- HEXAGON_STYLE cosmetics are now the contour of a square avatar: the site no
-- longer draws a hexagon. The codes are unchanged (loadouts store them); only
-- what a learner reads changes. packages/db/prisma/cosmetics.json carries the
-- same values, so a later db:seed-cosmetics --apply writes them again.

UPDATE "cosmetics" SET "label" = 'Cuivre', "description" = 'Le cuivre de la marque, l''accent par défaut.' WHERE "code" = 'accent-turquoise';
UPDATE "cosmetics" SET "description" = 'Le thème par défaut : carbone et craie.' WHERE "code" = 'theme-midnight-ops';
UPDATE "cosmetics" SET "label" = 'Contour plein', "description" = 'Le contour par défaut, plein et teinté.' WHERE "code" = 'hex-solid';
UPDATE "cosmetics" SET "label" = 'Contour fin', "description" = 'Un trait seul, sans teinte.' WHERE "code" = 'hex-outline';
UPDATE "cosmetics" SET "label" = 'Contour néon', "description" = 'Un trait épais qui rayonne.' WHERE "code" = 'hex-neon';
UPDATE "cosmetics" SET "label" = 'Contour circuit', "description" = 'Un trait en pointillés, façon piste de circuit imprimé.' WHERE "code" = 'hex-circuit';
UPDATE "cosmetics" SET "label" = 'Contour glitch', "description" = 'Un trait haché qui rayonne.' WHERE "code" = 'hex-glitch';
UPDATE "cosmetics" SET "label" = 'Contour prisme', "description" = 'Un double trait éclatant. Réservé à l''Élite.' WHERE "code" = 'hex-prisme';
