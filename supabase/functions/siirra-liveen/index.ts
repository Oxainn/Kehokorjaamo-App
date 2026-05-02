// Edge Function: siirra-liveen (D3)
// ------------------------------------------------------------------
// Yhdistää kehitys-haaran main-haaraan GitHub API:lla → Vercel deployaa
// Liven automaattisesti. Audit-loki tallennetaan julkaisut-tauluun.
//
// Pyyntö: POST /siirra-liveen
//   Header: Authorization: Bearer <user JWT>
//   Body: {
//     vahvistukset: { testattu: bool, ei_hoitoa: bool, migraatiot_ok: bool },
//     migraatiot_ajettu_kasin: bool  // jos true, ohitetaan migraatiotarkistus
//   }
// Vastaus: { onnistui, julkaisuId, mergeSha?, virhe? }
//
// Vaaditut env-vars (Edge Function-secretseinä):
//   GITHUB_TOKEN — Personal Access Token, scope 'repo'
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-asetettu)
//
// Auth: vain käyttäjä jonka email on ADMIN_EMAIL voi suorittaa tämän.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const ADMIN_EMAIL = "oxainn@gmail.com"
const GITHUB_REPO = "Oxainn/Kehokorjaamo-App"

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

interface Vahvistukset {
  testattu:       boolean
  ei_hoitoa:      boolean
  migraatiot_ok:  boolean
}

interface PyynnonBody {
  vahvistukset:            Vahvistukset
  migraatiot_ajettu_kasin: boolean
}

interface GithubCommit {
  sha:     string
  commit:  { message: string; author: { name: string; date: string } }
  html_url: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST")    return jsonResponse({ virhe: "Vain POST sallittu" }, 405)

  const aloitusAika = Date.now()

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const githubToken = Deno.env.get("GITHUB_TOKEN")
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ virhe: "Palvelin väärin konfiguroitu (Supabase env puuttuu)" }, 500)
    }
    if (!githubToken) {
      return jsonResponse({ virhe: "Palvelin väärin konfiguroitu (GITHUB_TOKEN puuttuu)" }, 500)
    }

    // 1) Tunnista käyttäjä JWT:n perusteella
    const authHeader = req.headers.get("Authorization") ?? ""
    const jwt = authHeader.replace(/^Bearer\s+/i, "")
    if (!jwt) return jsonResponse({ virhe: "Authorization-header puuttuu" }, 401)

    const supa = createClient(supabaseUrl, serviceKey)
    const { data: userData, error: userErr } = await supa.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return jsonResponse({ virhe: "Käyttäjän tunnistus epäonnistui" }, 401)
    }
    const user = userData.user
    if (user.email !== ADMIN_EMAIL) {
      return jsonResponse({ virhe: `Vain admin (${ADMIN_EMAIL}) voi suorittaa siirron` }, 403)
    }

    // 2) Tarkista vahvistukset
    let body: PyynnonBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ virhe: "Body ei ole JSON" }, 400)
    }
    const v = body?.vahvistukset
    if (!v || !v.testattu || !v.ei_hoitoa || !v.migraatiot_ok) {
      return jsonResponse({ virhe: "Kaikki vahvistukset täytyy rastittaa" }, 400)
    }
    if (!body.migraatiot_ajettu_kasin) {
      // Tämä ensimmäinen versio EI aja DB-migraatioita automaattisesti.
      // Käyttäjän pitää ajaa ne käsin ennen siirtoa, ja vahvistaa se
      // erillisellä lipulla. Myöhempi vaihe (D3.1) lisää automaation.
      return jsonResponse({
        virhe: "Tämä versio vaatii että migraatiot on ajettu käsin Supabase MCP:llä. Aseta migraatiot_ajettu_kasin=true kun olet tehnyt sen.",
      }, 400)
    }

    // 3) Hae erot main...kehitys GitHub APIsta (ennen mergea, audit-tietoja varten)
    const compareRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/compare/main...kehitys`,
      { headers: { Accept: "application/vnd.github.v3+json", Authorization: `Bearer ${githubToken}` } }
    )
    if (!compareRes.ok) {
      return jsonResponse({ virhe: `GitHub compare-API: ${compareRes.status}` }, 502)
    }
    const compareData = await compareRes.json()
    const commits: GithubCommit[] = compareData.commits ?? []
    if (commits.length === 0) {
      return jsonResponse({ virhe: "Ei muutoksia julkaistavaksi — main ja kehitys ovat samalla commitilla" }, 400)
    }

    // 4) Aloita audit-rivi
    const julkaistutLista = commits.map((c) => ({
      sha:    c.sha,
      viesti: c.commit.message.split("\n")[0],
      pvm:    c.commit.author?.date ?? null,
      tekija: c.commit.author?.name ?? null,
    }))
    const { data: julkaisuRivi, error: insErr } = await supa
      .from("julkaisut")
      .insert({
        kayttaja_id:         user.id,
        toiminto:            "siirto-liveen",
        julkaistut_commitit: julkaistutLista,
        ajot_migraatiot:     null,  // D3.1
        status:              "kaynnissa",
      })
      .select("id")
      .single()
    if (insErr || !julkaisuRivi) {
      return jsonResponse({ virhe: `Audit-loki: ${insErr?.message ?? "tuntematon"}` }, 500)
    }

    // 5) GitHub merge: kehitys → main
    const mergeViesti = `🚀 Siirrä Liveen: ${commits.length} commit${commits.length === 1 ? "" : "tia"} kehityksestä mainiin`
    const mergeRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/merges`,
      {
        method:  "POST",
        headers: {
          Accept:        "application/vnd.github.v3+json",
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base:           "main",
          head:           "kehitys",
          commit_message: mergeViesti,
        }),
      }
    )

    if (mergeRes.status === 409) {
      // Yhdistämiskonflikti — älä yritä automaattista resoluutiota
      const virhe = "Yhdistämiskonflikti — kehitys-haarassa muutoksia jotka ovat ristiriidassa main-haaran kanssa. Ratkaise konflikti Code-istunnossa ennen kuin yrität julkaista uudelleen."
      await supa.from("julkaisut").update({
        status:    "epaonnistui",
        virhe,
        kesto_ms:  Date.now() - aloitusAika,
        paivitetty: new Date().toISOString(),
      }).eq("id", julkaisuRivi.id)
      return jsonResponse({ onnistui: false, virhe, julkaisuId: julkaisuRivi.id }, 409)
    }

    if (!mergeRes.ok) {
      const txt = await mergeRes.text()
      const virhe = `GitHub merge epäonnistui (${mergeRes.status}): ${txt.slice(0, 200)}`
      await supa.from("julkaisut").update({
        status:    "epaonnistui",
        virhe,
        kesto_ms:  Date.now() - aloitusAika,
        paivitetty: new Date().toISOString(),
      }).eq("id", julkaisuRivi.id)
      return jsonResponse({ onnistui: false, virhe, julkaisuId: julkaisuRivi.id }, 502)
    }

    const mergeData = await mergeRes.json()
    const mergeSha = mergeData?.sha ?? null

    // 6) Päivitä audit-rivi onnistuneeksi
    await supa.from("julkaisut").update({
      status:     "valmis",
      merge_sha:  mergeSha,
      kesto_ms:   Date.now() - aloitusAika,
      paivitetty: new Date().toISOString(),
    }).eq("id", julkaisuRivi.id)

    return jsonResponse({
      onnistui:   true,
      julkaisuId: julkaisuRivi.id,
      mergeSha,
      committeja: commits.length,
    }, 200)

  } catch (e) {
    const viesti = e instanceof Error ? e.message : String(e)
    return jsonResponse({ virhe: `Sisäinen virhe: ${viesti}` }, 500)
  }
})
