-- VB2: optimistinen lukko hoitokäynnille — estää kahdesta välilehdestä
-- yhtaikaiset tallennukset menettämästä toisensa muutoksia.
-- Joka tallennus inkrementoi versiota, ja UI lähettää oman lähtöversionsa
-- mukana. Jos DB-versio > lähtö → ristiriita havaittu.

ALTER TABLE public.hoitokaynnit
  ADD COLUMN IF NOT EXISTS versio integer NOT NULL DEFAULT 0;
