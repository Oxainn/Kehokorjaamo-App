-- VB7: Estä itsehoito-harjoituksen poisto kaskadoinnilla, jotta asiakkaiden
-- ohjelmiin tallennettu hoitohistoria pysyy ehjänä. Hoitaja voi vain
-- arkistoida harjoituksen (UPDATE arkistoitu = true), ei poistaa.
--
-- ON DELETE RESTRICT estää poiston jos kirjastoharjoitukseen viittaa
-- yhtäkään käynnin valintaa. Itsehoito_kirjasto-rivi pysyy DB:ssä,
-- mutta UI piilottaa sen `arkistoitu = true` -lipulla.

ALTER TABLE public.itsehoito_kaynnin_valinnat
  DROP CONSTRAINT IF EXISTS itsehoito_kaynnin_valinnat_kirjasto_harjoitus_id_fkey;

ALTER TABLE public.itsehoito_kaynnin_valinnat
  ADD CONSTRAINT itsehoito_kaynnin_valinnat_kirjasto_harjoitus_id_fkey
  FOREIGN KEY (kirjasto_harjoitus_id)
  REFERENCES public.itsehoito_kirjasto(id)
  ON DELETE RESTRICT;
