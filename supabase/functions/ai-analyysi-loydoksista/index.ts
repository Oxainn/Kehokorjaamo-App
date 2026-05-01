// Edge Function: ai-analyysi-loydoksista
// ------------------------------------------------------------------
// Vaihe B Pala B8 — kutsuu Anthropic Claude API:a hoitajan löydösten
// analysointiin jäsenkorjaajan näkökulmasta.
//
// VB6: rate-limit per hoitaja — max 30 kutsua / tunti, 200 / päivä.
// Joka kutsu logataan ai_kutsu_loki-tauluun. Estetään kustannusten
// karkaaminen jos UI-nappia hakkaa toistuvasti.
//
// verify_jwt = true: vain kirjautuneet hoitajat saavat tehdä kutsuja.
// API-avain ANTHROPIC_API_KEY luetaan Supabase secret:eistä.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const MALLI = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 1000

// VB6 rate-limit: 30 kutsua / tunti, 200 / päivä per hoitaja.
const TUNNIN_KIINTIO = 30
const PAIVAN_KIINTIO = 200

type Finding = {
  alueId?: string
  alueNimi?: string
  tyyppi?: string
  kipu?: number
  kirjaukset?: Record<string, string | null>
}

const MITTARI_NIMET: Record<string, string> = {
  lantion_kallistus_aste:           "Lantion kallistuskulma (°)",
  lantion_sivuttainen_aste:         "Lantion sivuttainen kallistus (°)",
  lantion_kierto_aste:              "Lantion kierto (°)",
  olkapaiden_korkeusero_cm:         "Olkapäiden korkeusero (cm)",
  paan_eteen_tyontyminen_cm:        "Pään eteen työntyminen (cm)",
  q_kulma_vasen_aste:               "Q-kulma vasen (°)",
  q_kulma_oikea_aste:               "Q-kulma oikea (°)",
  skolioosin_kierto_aste:           "Skolioosin kierto (°)",
  niskan_kaannos_vasen_aste:        "Niskan käännös vasen (°)",
  niskan_kaannos_oikea_aste:        "Niskan käännös oikea (°)",
  jalkapituus_ero_cm:               "Jalkapituus-ero (cm)",
  navicular_drop_vasen_mm:          "Navicular drop vasen (mm)",
  navicular_drop_oikea_mm:          "Navicular drop oikea (mm)",
  akillesjanteen_kulma_vasen_aste:  "Akillesjänteen kulma vasen (°)",
  akillesjanteen_kulma_oikea_aste:  "Akillesjänteen kulma oikea (°)",
}

function muotoileRyhma(findings: Finding[], tyyppi: string): string {
  return findings
    .filter((f) => f.tyyppi === tyyppi)
    .map((f) => {
      const osat: string[] = [`  • ${f.alueNimi ?? f.alueId} — kipu VAS ${f.kipu ?? 0}/10`]
      if (f.kirjaukset) {
        for (const [k, v] of Object.entries(f.kirjaukset)) {
          if (v !== null && v !== undefined && v !== "") {
            osat.push(`    ${k}: ${v}`)
          }
        }
      }
      return osat.join("\n")
    })
    .join("\n")
}

function muotoileMittarit(
  mittarit: Record<string, number | null> | undefined,
  edell: Record<string, number | null> | undefined,
): string {
  if (!mittarit) return ""
  const rivit: string[] = []
  for (const [sarake, nimi] of Object.entries(MITTARI_NIMET)) {
    const arvo = mittarit[sarake]
    if (arvo === null || arvo === undefined) continue
    const e = edell?.[sarake]
    const vert = (e !== null && e !== undefined) ? ` (edellinen ${e})` : ""
    rivit.push(`  ${nimi}: ${arvo}${vert}`)
  }
  if (rivit.length === 0) return ""
  return "MITTAUSTULOKSET:\n" + rivit.join("\n") + "\n\n"
}

function muotoileAsiakkaanOireet(
  kehonkartta: { merkinnat?: Record<string, string[]> } | null | undefined,
  asiakkaanOireet: string | undefined,
): string {
  const rivit: string[] = []
  if (kehonkartta?.merkinnat) {
    const lkm = Object.keys(kehonkartta.merkinnat).length
    if (lkm > 0) {
      rivit.push(`  Asiakas merkinnyt ${lkm} oirealuetta omassa kehonkartassaan.`)
      for (const [vyohykeId, oireet] of Object.entries(kehonkartta.merkinnat)) {
        const lista = Array.isArray(oireet) ? oireet.join(", ") : String(oireet)
        rivit.push(`    - ${vyohykeId}: ${lista}`)
      }
    }
  }
  if (asiakkaanOireet?.trim()) {
    rivit.push(`  Hoitoon tulon syy: ${asiakkaanOireet.trim()}`)
  }
  if (rivit.length === 0) return ""
  return "ASIAKKAAN ITSE KERTOMAT OIREET:\n" + rivit.join("\n") + "\n\n"
}

function rakennaPrompti(input: {
  findings: Finding[]
  mittarit?: Record<string, number | null>
  edellisetMittarit?: Record<string, number | null>
  asiakkaanKehonkartta?: { merkinnat?: Record<string, string[]> } | null
  asiakkaanOireet?: string
}): string {
  const { findings, mittarit, edellisetMittarit, asiakkaanKehonkartta, asiakkaanOireet } = input
  const primaari   = muotoileRyhma(findings, "primaari")
  const lantioSeur = muotoileRyhma(findings, "lantio-seuraus")
  const selkaSeur  = muotoileRyhma(findings, "selkaranka-seuraus")

  let teksti = "Olet kokenut kalevalainen jäsenkorjaaja. Analysoi alla olevat löydökset hoitajan näkökulmasta ja anna käytännön ohjeita.\n\n"

  teksti += muotoileAsiakkaanOireet(asiakkaanKehonkartta, asiakkaanOireet)

  if (primaari) {
    teksti += "PRIMAARISET LÖYDÖKSET (juurisyy):\n" + primaari + "\n\n"
  }
  if (lantioSeur) {
    teksti += "LANTION AIHEUTTAMAT SEURAUKSET:\n" + lantioSeur + "\n\n"
  }
  if (selkaSeur) {
    teksti += "SELKÄRANGAN SEURAUKSET:\n" + selkaSeur + "\n\n"
  }

  teksti += muotoileMittarit(mittarit, edellisetMittarit)

  teksti +=
    "OHJEET ANALYYSILLE:\n" +
    "- Lantio ja SI-nivel ovat juurisyy — aloita aina niiden hoidosta.\n" +
    "- Selitä mitkä seurauslöydökset johtuvat lantiosta.\n" +
    "- Huomioi, että monet seuraukset korjaantuvat lantion korjauksen myötä.\n" +
    "- Käytä selkokieltä ilman lääketieteellistä jargonia.\n" +
    "- Jos mittausvertailu on käytettävissä, kommentoi muutoksia.\n" +
    "- Jos asiakkaan oma oireilu eroaa hoitajan löydöksistä, huomioi se.\n\n" +
    "VASTAUKSEN MUOTO (suomeksi, markdownina):\n" +
    "## Yhteenveto\n[1–2 lausetta tilanteesta]\n\n" +
    "## Todennäköiset aiheuttajat\n- [aiheuttaja 1]\n- [aiheuttaja 2]\n\n" +
    "## Hoidon eteneminen\n1. [ensimmäinen hoidettava rakenne]\n2. [toinen]\n3. [kolmas]\n\n" +
    "## Itsehoitoehdotukset\n- [harjoitus / ohje 1]\n- [harjoitus / ohje 2]\n\n" +
    "Älä lisää muuta tekstiä ennen tai jälkeen. Pidä vastaus napakkana, alle 400 sanaa."

  return teksti
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
    // VB6 — autentikoi pyyntö ja selvitä hoitajan id rate-limittiä varten.
    // verify_jwt=true → Authorization-header on aina saatavilla.
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")
    const anonAvain    = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceAvain = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !anonAvain || !serviceAvain) {
      return jsonResponse({ virhe: "Palvelin on väärin konfiguroitu" }, 500)
    }
    const auth = req.headers.get("Authorization") ?? ""
    const sbUser = createClient(supabaseUrl, anonAvain, {
      global: { headers: { Authorization: auth } },
      auth:   { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: userVirhe } = await sbUser.auth.getUser()
    if (userVirhe || !user) {
      return jsonResponse({ virhe: "Kirjautuminen vaaditaan" }, 401)
    }
    const hoitajaId = user.id

    // Service-role-client lokin lukua/kirjoitusta varten (RLS ohitetaan)
    const sbAdmin = createClient(supabaseUrl, serviceAvain, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Rate-limit-tarkistus
    const tunti = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const paiva = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: tunnilla }, { count: paivassa }] = await Promise.all([
      sbAdmin.from("ai_kutsu_loki").select("*", { count: "exact", head: true })
        .eq("hoitaja_id", hoitajaId).gte("luotu", tunti),
      sbAdmin.from("ai_kutsu_loki").select("*", { count: "exact", head: true })
        .eq("hoitaja_id", hoitajaId).gte("luotu", paiva),
    ])
    if ((tunnilla ?? 0) >= TUNNIN_KIINTIO) {
      return jsonResponse({
        virhe: `Tunnin AI-kiintiö täynnä (${TUNNIN_KIINTIO} kutsua/h). Yritä hetken kuluttua.`,
        rate_limit: { tunnilla, tunnin_kiintio: TUNNIN_KIINTIO, paivassa, paivan_kiintio: PAIVAN_KIINTIO },
      }, 429)
    }
    if ((paivassa ?? 0) >= PAIVAN_KIINTIO) {
      return jsonResponse({
        virhe: `Päivän AI-kiintiö täynnä (${PAIVAN_KIINTIO} kutsua/24h). Koeta huomenna.`,
        rate_limit: { tunnilla, tunnin_kiintio: TUNNIN_KIINTIO, paivassa, paivan_kiintio: PAIVAN_KIINTIO },
      }, 429)
    }

    const body = await req.json()
    const findings = (body?.findings ?? []) as Finding[]
    if (!Array.isArray(findings) || findings.length === 0) {
      return jsonResponse({ virhe: "Löydöksiä ei annettu — tee ensin havaintoja BodyMap:ssa." }, 400)
    }

    const apiAvain = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiAvain) {
      return jsonResponse({
        virhe: "ANTHROPIC_API_KEY puuttuu palvelimen secret-asetuksista. Lisää se Supabase Dashboard → Edge Functions → Secrets.",
      }, 500)
    }

    const prompti = rakennaPrompti({
      findings,
      mittarit:             body?.mittarit,
      edellisetMittarit:    body?.edellisetMittarit,
      asiakkaanKehonkartta: body?.asiakkaanKehonkartta,
      asiakkaanOireet:      body?.asiakkaanOireet,
    })
    const hoitokayntiId = body?.hoitokayntiId ?? null

    const vastaus = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiAvain,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      MALLI,
        max_tokens: MAX_TOKENS,
        messages:   [{ role: "user", content: prompti }],
      }),
    })

    if (!vastaus.ok) {
      const virheteksti = await vastaus.text().catch(() => "")
      console.error("[ai-analyysi-loydoksista] Anthropic-virhe", vastaus.status, virheteksti)
      // Logaa epäonnistunut kutsu — kuluttaa kvoota silti, jotta toistuva
      // virhe ei johda loputtomaan retryyn.
      await sbAdmin.from("ai_kutsu_loki").insert({
        hoitaja_id:     hoitajaId,
        malli:          MALLI,
        hoitokaynti_id: hoitokayntiId,
        onnistunut:     false,
      }).then(() => {}).catch(() => {})
      return jsonResponse({
        virhe: `AI-palvelu palautti virheen (${vastaus.status}). ${virheteksti.slice(0, 200)}`,
      }, 502)
    }

    const data = await vastaus.json() as {
      content?: Array<{ type: string; text?: string }>
    }
    const teksti = (data.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n")
      .trim()

    if (!teksti) {
      await sbAdmin.from("ai_kutsu_loki").insert({
        hoitaja_id:     hoitajaId,
        malli:          MALLI,
        hoitokaynti_id: hoitokayntiId,
        onnistunut:     false,
      }).then(() => {}).catch(() => {})
      return jsonResponse({ virhe: "AI palautti tyhjän vastauksen." }, 502)
    }

    // Logaa onnistunut kutsu
    await sbAdmin.from("ai_kutsu_loki").insert({
      hoitaja_id:     hoitajaId,
      malli:          MALLI,
      hoitokaynti_id: hoitokayntiId,
      onnistunut:     true,
    }).then(() => {}).catch((e) => console.warn("[ai] lokin kirjoitus epäonnistui:", e))

    return jsonResponse({
      analyysi: teksti,
      prompti,
      malli:    MALLI,
      virhe:    null,
      rate_limit: {
        tunnilla:        (tunnilla ?? 0) + 1,
        tunnin_kiintio:  TUNNIN_KIINTIO,
        paivassa:        (paivassa ?? 0) + 1,
        paivan_kiintio:  PAIVAN_KIINTIO,
      },
    }, 200)

  } catch (e) {
    console.error("[ai-analyysi-loydoksista] Virhe:", e)
    const viesti = (e as Error)?.message ?? "Tuntematon virhe"
    return jsonResponse({ virhe: viesti }, 500)
  }
})
