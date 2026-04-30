// Edge Function: tallenna-julkinen-lomake
// ------------------------------------------------------------------
// Vastaanottaa POST-pyynnön anonyymiltä asiakkaalta jolla ei ole sessiota,
// ja tallentaa lomakedatan service_role-avaimella (ohittaen RLS:n).
//
// Pyynnön muoto:
//   {
//     hoitajaId: uuid (pakollinen),
//     palveluId: uuid | null,
//     vastaukset: { [kentta_id_tunniste]: arvo }
//   }
//
// Palauttaa:
//   { asiakasId, lomakeVersioId, virhe }
//
// Turvallisuus:
//   - Service_role-avain on vain tämän funktion ympäristössä, ei selaimessa
//   - verify_jwt = false koska asiakas ei ole kirjautunut
//   - Validoi että palvelu kuuluu annetulle hoitajalle (ei voi tallentaa
//     mielivaltaiseen hoitaja-tiliin ilman palvelu-yhteyttä)
//   - Asiakkaan sähköpostin perusteella upsert: päivittää saman hoitajan
//     olemassa olevia asiakkaita, tai luo uuden

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Mappaus pohjan kentta_id_tunniste:sta → asiakkaat-taulun sarakkeisiin.
// Pidettävä synkronoituna lib/lomakeTallennus.js:n kanssa.
const ASIAKAS_SARAKKEET: Record<string, string> = {
  sahkoposti:   "sahkoposti",
  puhelin:      "puhelin",
  syntymaaika:  "syntymaaika",
  katuosoite:   "lahiosoite",
  postinumero:  "postinumero",
  kaupunki:     "postitoimipaikka",
  ammatti:      "ammatti",
  pituus:       "pituus",
  paino:        "paino",
}

const LOMAKE_SARAKKEET: Record<string, string> = {
  hoitoon_tulon_kuvaus: "hoitoon_syy",
  kipuluku:             "kipu_taso",
  laakkeet:             "laakitys",
  diagnoosit:           "diagnosoidut_sairaudet",
  vammat_huomiot:       "vammat_huomiot",
  harrastukset:         "harrastukset",
}

const SUOSTUMUS_SARAKKEET: Record<string, string> = {
  gdpr_hyvaksytty:   "suostumus_tietojen_sailytys",
  lupa_luovutukseen: "suostumus_tietojen_luovutus",
}

const SAIRAUDET_TUNNISTE = "sairaudet"

const ERIKOISKASITTELY = new Set([
  "etunimi",
  "sukunimi",
  ...Object.keys(ASIAKAS_SARAKKEET),
  ...Object.keys(LOMAKE_SARAKKEET),
  ...Object.keys(SUOSTUMUS_SARAKKEET),
  SAIRAUDET_TUNNISTE,
])

function jaaVastaukset(vastaukset: Record<string, unknown>) {
  const asiakas: Record<string, unknown> = {}
  const lomake: Record<string, unknown>  = {}
  const lisakentat: Record<string, unknown> = {}
  let sairaudet: string[] = []

  for (const [tunniste, arvo] of Object.entries(vastaukset ?? {})) {
    if (arvo === undefined) continue

    if (tunniste === "etunimi" || tunniste === "sukunimi") {
      asiakas[tunniste] = arvo
      continue
    }
    if (ASIAKAS_SARAKKEET[tunniste]) {
      asiakas[ASIAKAS_SARAKKEET[tunniste]] = arvo
      continue
    }
    if (SUOSTUMUS_SARAKKEET[tunniste]) {
      asiakas[SUOSTUMUS_SARAKKEET[tunniste]] = arvo === true
      continue
    }
    if (LOMAKE_SARAKKEET[tunniste]) {
      lomake[LOMAKE_SARAKKEET[tunniste]] = arvo
      continue
    }
    if (tunniste === SAIRAUDET_TUNNISTE) {
      sairaudet = Array.isArray(arvo) ? (arvo as string[]) : []
      continue
    }
    if (!ERIKOISKASITTELY.has(tunniste)) {
      lisakentat[tunniste] = arvo
    }
  }

  const etunimi  = (asiakas.etunimi  as string) ?? ""
  const sukunimi = (asiakas.sukunimi as string) ?? ""
  const yhdistetty = `${etunimi} ${sukunimi}`.trim()
  if (yhdistetty) asiakas.nimi = yhdistetty
  delete asiakas.etunimi
  delete asiakas.sukunimi

  return { asiakas, lomake, sairaudet, lisakentat }
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST")    return jsonResponse({ virhe: "Vain POST sallittu" }, 405)

  try {
    const body = await req.json()
    const { hoitajaId, palveluId, vastaukset } = body ?? {}

    if (!hoitajaId)  return jsonResponse({ virhe: "hoitajaId puuttuu" }, 400)
    if (!vastaukset) return jsonResponse({ virhe: "vastaukset puuttuu" }, 400)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ virhe: "Palvelin on väärin konfiguroitu" }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validointi: jos palveluId annettu, sen pitää kuulua tälle hoitajalle.
    // Tämä estää mielivaltaisen hoitajan tilille tallentamisen ilman
    // legitiimiä palvelu-pohjaa.
    if (palveluId) {
      const { data: palvelu, error: palveluVirhe } = await supabase
        .from("palvelut")
        .select("id, hoitaja_id, aktiivinen")
        .eq("id", palveluId)
        .single()

      if (palveluVirhe || !palvelu) {
        return jsonResponse({ virhe: "Palvelua ei löydy" }, 404)
      }
      if (palvelu.hoitaja_id !== hoitajaId) {
        return jsonResponse({ virhe: "Palvelu ei kuulu annetulle hoitajalle" }, 403)
      }
      if (!palvelu.aktiivinen) {
        return jsonResponse({ virhe: "Palvelu ei ole aktiivinen" }, 400)
      }
    }

    const jaettu = jaaVastaukset(vastaukset)

    // ── 1. Asiakas: etsi sähköpostilla, päivitä tai luo uusi ─────────
    let asiakasId: string | null = null
    const sahkoposti = jaettu.asiakas.sahkoposti as string | undefined

    if (sahkoposti && sahkoposti.trim()) {
      const { data: olemassa } = await supabase
        .from("asiakkaat")
        .select("id")
        .eq("hoitaja_id", hoitajaId)
        .eq("sahkoposti", sahkoposti.trim())
        .maybeSingle()
      if (olemassa) asiakasId = olemassa.id
    }

    if (asiakasId) {
      const { error: paivitysVirhe } = await supabase
        .from("asiakkaat")
        .update({ ...jaettu.asiakas, paivitetty: new Date().toISOString() })
        .eq("id", asiakasId)
      if (paivitysVirhe) throw paivitysVirhe
    } else {
      const { data: uusi, error: luontiVirhe } = await supabase
        .from("asiakkaat")
        .insert({ ...jaettu.asiakas, hoitaja_id: hoitajaId })
        .select("id")
        .single()
      if (luontiVirhe) throw luontiVirhe
      asiakasId = uusi.id
    }

    // ── 2. Sulje vanhat lomakeversiot ────────────────────────────────
    const { error: sulkuVirhe } = await supabase
      .from("asiakastietolomake_versiot")
      .update({ voimassa_asti: new Date().toISOString() })
      .eq("asiakas_id", asiakasId)
      .is("voimassa_asti", null)
    if (sulkuVirhe) throw sulkuVirhe

    // ── 3. Luo uusi lomakeversio ─────────────────────────────────────
    const { data: versio, error: versioVirhe } = await supabase
      .from("asiakastietolomake_versiot")
      .insert({
        asiakas_id:      asiakasId,
        ...jaettu.lomake,
        lisakentat:      jaettu.lisakentat,
        muokkaaja_rooli: "asiakas",
      })
      .select("id")
      .single()
    if (versioVirhe) throw versioVirhe

    // ── 4. Sairaudet ─────────────────────────────────────────────────
    if (jaettu.sairaudet.length > 0) {
      const rivit = jaettu.sairaudet.map((id: string) => ({
        lomake_versio_id:  versio.id,
        sairaus_tyyppi_id: id,
        on_voimassa:       true,
      }))
      const { error: sairaudetVirhe } = await supabase
        .from("lomake_sairaudet")
        .insert(rivit)
      if (sairaudetVirhe) throw sairaudetVirhe
    }

    return jsonResponse({
      asiakasId,
      lomakeVersioId: versio.id,
      virhe:          null,
    }, 200)

  } catch (e) {
    console.error("[tallenna-julkinen-lomake] Tallennus epäonnistui:", e)
    const viesti = (e as Error)?.message ?? "Tuntematon virhe"
    return jsonResponse({ virhe: viesti }, 500)
  }
})
