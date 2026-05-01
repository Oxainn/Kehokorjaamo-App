-- VB6: AI-kutsujen loki rate-limittausta varten.
-- Joka kutsu Edge Functioniin (myös ei-tallennetut) kirjautuu tähän,
-- jotta voidaan rajoittaa tunnin/päivän kustannukset hoitajakohtaisesti.

CREATE TABLE public.ai_kutsu_loki (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoitaja_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  luotu           timestamp with time zone NOT NULL DEFAULT now(),
  malli           text,
  hoitokaynti_id  uuid REFERENCES public.hoitokaynnit(id) ON DELETE SET NULL,
  onnistunut      boolean NOT NULL DEFAULT true
);

CREATE INDEX ai_kutsu_loki_hoitaja_aika_idx
  ON public.ai_kutsu_loki (hoitaja_id, luotu DESC);

ALTER TABLE public.ai_kutsu_loki ENABLE ROW LEVEL SECURITY;

-- Hoitaja näkee oman kutsulokinsa (UI:n kvoot-laskuria varten)
CREATE POLICY "Hoitaja näkee oman AI-kutsulokinsa"
  ON public.ai_kutsu_loki
  FOR SELECT
  USING (auth.uid() = hoitaja_id);

-- Edge Function (service_role) hoitaa kirjoittamisen — selain ei kirjoita
-- suoraan tähän tauluun. Ei INSERT/UPDATE-policya hoitajalle.
