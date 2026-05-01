// Edge Function: hae-julkiset-palvelut
// ------------------------------------------------------------------
// Palauttaa anonyymille asiakkaalle (kotisivulta tulevalle) listan
// aktiivisista palveluista joilla on aktiivinen lomakepohja. Käytössä
// /uusi-asiakas -palveluvalintasivulla.
//
// Pyyntö:  GET /hae-julkiset-palvelut[?hoitajaId=UUID]
// Vastaus: { palvelut: [{ id, hoitaja_id, nimi, kuvaus, kesto_min,
//                          hinta_eur, jarjestys }], virhe }
//
// Suodattaa pois palvelut jotka:
//   - eivät ole aktiivisia (palvelut.aktiivinen = false)
//   - eivät käytä lomakepohjaa (lomakepohja_id is null)
//   - käyttävät inaktiivista pohjaa (lomakepohjat.aktiivinen = false)
//
// Ei palauta varauslinkki_url:ia eikä paivitetty/luotu-aikoja —
// julkisen valintasivun ei tarvitse niitä.
//
// Hoitajafiltteri (?hoitajaId=...) on valinnainen — multi-tenant-vaiheessa
// kotisivu antaa hoitajan id:n parametrina, mutta nykyisellä yhden hoitajan
// asetelmalla palauttaa kaikki.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "GET")     return jsonResponse({ virhe: "Vain GET sallittu" }, 405)

  try {
    const url = new URL(req.url)
    const hoitajaId = url.searchParams.get("hoitajaId")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ virhe: "Palvelin on väärin konfiguroitu" }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from("palvelut")
      .select("id, hoitaja_id, nimi, kuvaus, kesto_min, hinta_eur, jarjestys, lomakepohja_id, lomakepohjat:lomakepohja_id(aktiivinen)")
      .eq("aktiivinen", true)
      .not("lomakepohja_id", "is", null)
      .order("jarjestys", { ascending: true, nullsFirst: false })
      .order("nimi",      { ascending: true })

    if (hoitajaId) query = query.eq("hoitaja_id", hoitajaId)

    const { data, error } = await query

    if (error) {
      console.error("[hae-julkiset-palvelut] Haku epäonnistui:", error)
      return jsonResponse({ virhe: "Palvelujen haku epäonnistui" }, 500)
    }

    // Suodata pois palvelut joilla on inaktiivinen pohja — joinin tulos
    // palauttaa rivin myös kun lomakepohja on inaktiivinen, mutta haluamme
    // näyttää vain valmiit toimivat palvelut.
    const palvelut = (data ?? [])
      .filter((p: { lomakepohjat: { aktiivinen: boolean } | null }) => p.lomakepohjat?.aktiivinen === true)
      .map((p: { id: string; hoitaja_id: string; nimi: string; kuvaus: string | null; kesto_min: number | null; hinta_eur: number | null; jarjestys: number | null }) => ({
        id:         p.id,
        hoitaja_id: p.hoitaja_id,
        nimi:       p.nimi,
        kuvaus:     p.kuvaus,
        kesto_min:  p.kesto_min,
        hinta_eur:  p.hinta_eur,
        jarjestys:  p.jarjestys,
      }))

    return jsonResponse({ palvelut, virhe: null }, 200)

  } catch (e) {
    console.error("[hae-julkiset-palvelut] Virhe:", e)
    const viesti = (e as Error)?.message ?? "Tuntematon virhe"
    return jsonResponse({ virhe: viesti }, 500)
  }
})
