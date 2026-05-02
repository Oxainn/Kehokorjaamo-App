// productboardClient — erillinen Supabase-client joka osoittaa AINA
// Live-DB:hen (uwysictfbzswecnxvmif), riippumatta siitä missä ympäristössä
// koodi pyörii.
//
// Tarkoitus: productboard-data (visio, ideat, todo, changelog) on yhden
// adminin (Oxan) muistilappu. Kun Kehitys ja Live ovat erillisiä DB:itä,
// muutokset eivät synkronoidu — käyttäjä voi merkitä TODO:n valmiiksi
// kehityksessä ja vielä Live-puolen näkymässä se näkyy avoimena.
// Eliminoidaan tämä lukitsemalla productboard yhteen lähteeseen (Live).
//
// Muut taulut (asiakkaat, hoitokaynnit, palvelut, lomakeversiot,
// asentokuvat, julkaisut, user_preferences, tarkistuskierrokset) käyttävät
// edelleen ympäristökohtaista clientiä `services/supabase.js`:stä.
//
// HUOM auth: tällä clientilla persistSession: false → ei istuntoa.
// Live-DB:n productboard-RLS vaatii authenticated + hoitaja_id = auth.uid().
// - Live-frontendillä: main client IS Live → käyttäjä autentikoitu samalla
//   anon-keyllä mutta omalla istunnollaan → kyselyt eivät kuitenkaan saa
//   istuntoa tämän erillisen clientin kautta. Näin ollen tämä client menee
//   anon-roolilla → RLS torjuu.
// Käyttäjä päättää RLS-strategian: löysempi anon-policy productboardille,
// tai tämän clientin sessio-jako main-clientin kanssa myöhemmin.

import { createClient } from '@supabase/supabase-js'

const LIVE_URL      = 'https://uwysictfbzswecnxvmif.supabase.co'
const LIVE_ANON_KEY = import.meta.env.VITE_LIVE_ANON_KEY

if (!LIVE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[productboardClient] VITE_LIVE_ANON_KEY puuttuu — productboard-kyselyt epäonnistuvat')
}

export const productboardClient = createClient(LIVE_URL, LIVE_ANON_KEY ?? '', {
  auth: {
    persistSession:    false,
    autoRefreshToken:  false,
  },
})
