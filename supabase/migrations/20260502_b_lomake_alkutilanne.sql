-- B-lomake: hoitokaynnit.lahtotilanne -> alkutilanne
-- Yhtenäistää terminologia: Alkutilanne (ei "lähtötilanne") koko
-- sovelluksen läpi (UI, koodi, DB, PDF).

ALTER TABLE hoitokaynnit RENAME COLUMN lahtotilanne TO alkutilanne;
