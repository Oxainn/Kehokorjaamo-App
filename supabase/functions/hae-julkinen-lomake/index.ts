// Edge Function: hae-julkinen-lomake
// ------------------------------------------------------------------
// Palauttaa anonyymille asiakkaalle kaiken mitä lomakkeen renderöinti
// vaatii: palvelu (julkiset kentät), oletuspohjan rakenne, kentat-mappauksen.
//
// Pyyntö: GET /hae-julkinen-lomake?palveluId=UUID
// Vastaus: { palvelu, rakenne, kentat, virhe }
//
// Suodattaa ulos hoitaja_id:n yms sisäiset kentät — palautusrakenne
// on minimi mitä lomakkeen täyttäminen vaatii.

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
    const palveluId = url.searchParams.get("palveluId")
    if (!palveluId) return jsonResponse({ virhe: "palveluId puuttuu" }, 400)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ virhe: "Palvelin on väärin konfiguroitu" }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 1. Palvelu ─────────────────────────────────────────────
    const { data: palvelu, error: palveluVirhe } = await supabase
      .from("palvelut")
      .select("id, hoitaja_id, nimi, kuvaus, kesto_min, hinta_eur, varauslinkki_url, aktiivinen")
      .eq("id", palveluId)
      .eq("aktiivinen", true)
      .single()

    if (palveluVirhe || !palvelu) {
      return jsonResponse({ virhe: "Palvelua ei löydy tai se ei ole aktiivinen" }, 404)
    }

    // ── 2. Oletuspohja palvelulle ──────────────────────────────
    const { data: linkki, error: linkkiVirhe } = await supabase
      .from("palvelu_lomake_linkit")
      .select("pohja_id, on_oletus, lomakepohjat(id, nimi, aktiivinen)")
      .eq("palvelu_id", palveluId)
      .order("on_oletus", { ascending: false })  // Oletus ensin
      .limit(1)
      .maybeSingle()

    if (linkkiVirhe || !linkki) {
      return jsonResponse({
        virhe: "Palvelulle ei ole liitetty lomakepohjaa. Hoitajan pitää tehdä se editorissa.",
      }, 404)
    }

    const pohjaId = linkki.pohja_id

    // ── 3. Pohjan uusin aktiivinen versio ──────────────────────
    const { data: versio, error: versioVirhe } = await supabase
      .from("lomakepohja_versiot")
      .select("rakenne")
      .eq("pohja_id", pohjaId)
      .eq("aktiivinen", true)
      .order("versio", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versioVirhe || !versio) {
      return jsonResponse({ virhe: "Pohjasta ei löydy aktiivista versiota" }, 404)
    }

    const rakenne = versio.rakenne

    // ── 4. Kenttäkirjasto pohjan tunnisteille ──────────────────
    const tunnisteet: string[] = []
    for (const osio of (rakenne?.osiot ?? [])) {
      for (const kf of (osio.kenttat ?? [])) {
        if (kf.kentta_id_tunniste) tunnisteet.push(kf.kentta_id_tunniste)
      }
    }

    const kentat: Record<string, unknown> = {}
    if (tunnisteet.length > 0) {
      const { data: kenttaRivit, error: kenttaVirhe } = await supabase
        .from("kenttakirjasto")
        .select("id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset, kentan_versiot(versio, kaannokset, aktiivinen)")
        .in("kentta_id_tunniste", tunnisteet)
        .eq("hoitaja_id", palvelu.hoitaja_id)  // Vain tämän hoitajan kentät

      if (kenttaVirhe) throw kenttaVirhe

      for (const k of (kenttaRivit ?? [])) {
        const v = (k.kentan_versiot ?? [])
          .filter((x: { aktiivinen: boolean }) => x.aktiivinen)
          .sort((a: { versio: number }, b: { versio: number }) => b.versio - a.versio)[0]
        kentat[k.kentta_id_tunniste] = {
          id:         k.id,
          tunniste:   k.kentta_id_tunniste,
          tyyppi:     k.kenttatyyppi,
          validointi: k.validointi ?? {},
          oletukset:  k.oletukset ?? {},
          kaannokset: v?.kaannokset ?? {},
        }
      }
    }

    // ── 5. Palauta — suodata pois sisäiset kentät ──────────────
    return jsonResponse({
      palvelu: {
        id:               palvelu.id,
        hoitaja_id:       palvelu.hoitaja_id,  // tarvitaan tallennukseen
        nimi:             palvelu.nimi,
        kuvaus:           palvelu.kuvaus,
        kesto_min:        palvelu.kesto_min,
        hinta_eur:        palvelu.hinta_eur,
        varauslinkki_url: palvelu.varauslinkki_url,
      },
      rakenne,
      kentat,
      virhe: null,
    }, 200)

  } catch (e) {
    console.error("[hae-julkinen-lomake] Virhe:", e)
    const viesti = (e as Error)?.message ?? "Tuntematon virhe"
    return jsonResponse({ virhe: viesti }, 500)
  }
})
