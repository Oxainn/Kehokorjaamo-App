-- Pala 2.16 (2026-05-05): lomakepohjat.jarjestys
--
-- Lisää järjestys-sarake lomakepohja-listan käyttäjäohjattua järjestämistä varten.
-- Sama tapa kuin palveluilla (palvelut.jarjestys integer DEFAULT 0).
--
-- Olemassa olevat pohjat saavat järjestyksen luotu-aikaleiman perusteella
-- (ROW_NUMBER ikkunafunktiolla per hoitaja). Tämän jälkeen UI:n ▲▼-napit
-- siirtävät pohjia vaihtamalla viereisten rivien jarjestys-arvoja.

ALTER TABLE public.lomakepohjat
  ADD COLUMN IF NOT EXISTS jarjestys integer NOT NULL DEFAULT 0;

-- Anna olemassa oleville pohjille järkevä lähtöjärjestys luotu-ajan mukaan.
-- Tehdään vain jos kaikilla on default-arvo 0 (eli sarake juuri lisättiin).
UPDATE public.lomakepohjat AS lp
SET jarjestys = sub.rivinumero
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY hoitaja_id ORDER BY luotu) AS rivinumero
  FROM public.lomakepohjat
) AS sub
WHERE lp.id = sub.id
  AND lp.jarjestys = 0;

-- Indeksi listauksen nopeuttamiseksi
CREATE INDEX IF NOT EXISTS idx_lomakepohjat_jarjestys
  ON public.lomakepohjat (hoitaja_id, jarjestys);
