// Edge Function: palauta-edellinen-live (D5)
// ------------------------------------------------------------------
// Promptaa Vercelin "Promote previous deployment" -toiminnolla Live-
// projektin edellinen valmis deployment takaisin tuotantoon. Audit-loki
// tallennetaan julkaisut-tauluun (action='rollback').
//
// Pyyntö: POST /palauta-edellinen-live
//   Header: Authorization: Bearer <user JWT>
//   Body: {
//     vahvistukset: { ymmarretty: bool, ei_hoitoa: bool, otettu_yhteyttä: bool }
//   }
// Vastaus: { onnistui, julkaisuId, vercelDeployId?, virhe? }
//
// Vaaditut env-vars:
//   VERCEL_TOKEN — Vercel-tilin Access Token
//   VERCEL_LIVE_PROJECT_ID — Live-projektin ID
//   VERCEL_TEAM_ID         — (valinnainen) tiimi-id, jos käytät tiimiä
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-asetettu)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const ADMIN_EMAIL = "oxainn@gmail.com"

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

interface VercelDeployment {
  uid:    string
  state:  string
  meta?:  { githubCommitSha?: string; githubCommitMessage?: string }
  ready?: number
  created: number
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST")    return jsonResponse({ virhe: "Vain POST sallittu" }, 405)

  const aloitusAika = Date.now()

  try {
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")
    const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const vercelToken   = Deno.env.get("VERCEL_TOKEN")
    const liveProjektId = Deno.env.get("VERCEL_LIVE_PROJECT_ID")
    const teamId        = Deno.env.get("VERCEL_TEAM_ID")  // valinnainen
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ virhe: "Palvelin väärin konfiguroitu (Supabase env puuttuu)" }, 500)
    }
    if (!vercelToken || !liveProjektId) {
      return jsonResponse({ virhe: "Palvelin väärin konfiguroitu (VERCEL_TOKEN tai VERCEL_LIVE_PROJECT_ID puuttuu)" }, 500)
    }

    // 1) Käyttäjä-auth + admin-tarkistus
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
      return jsonResponse({ virhe: `Vain admin (${ADMIN_EMAIL}) voi suorittaa rollbackin` }, 403)
    }

    // 2) Vahvistukset
    let body: { vahvistukset?: { ymmarretty?: boolean; ei_hoitoa?: boolean; otettu_yhteytta?: boolean } } = {}
    try { body = await req.json() } catch {
      return jsonResponse({ virhe: "Body ei ole JSON" }, 400)
    }
    const v = body.vahvistukset
    if (!v?.ymmarretty || !v?.ei_hoitoa || !v?.otettu_yhteytta) {
      return jsonResponse({ virhe: "Kaikki vahvistukset täytyy rastittaa" }, 400)
    }

    // 3) Hae Vercel-projektin valmiit deploymentit (uusin ensin)
    const teamSuffix = teamId ? `?teamId=${teamId}` : ""
    const depRes = await fetch(
      `https://api.vercel.com/v6/deployments${teamSuffix}${teamSuffix ? "&" : "?"}projectId=${liveProjektId}&state=READY&limit=10`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    if (!depRes.ok) {
      const txt = await depRes.text()
      return jsonResponse({ virhe: `Vercel API: ${depRes.status} ${txt.slice(0, 200)}` }, 502)
    }
    const depData = await depRes.json()
    const valmiit: VercelDeployment[] = (depData?.deployments ?? []).filter(
      (d: VercelDeployment) => d.state === "READY"
    )
    if (valmiit.length < 2) {
      return jsonResponse({ virhe: "Ei aiempaa valmista deploymenttiä — rollback ei mahdollinen" }, 400)
    }

    // valmiit[0] = nykyinen production, valmiit[1] = edellinen
    const edellinen = valmiit[1]
    const nykyinen  = valmiit[0]

    // 4) Aloita audit-rivi
    const peruttavatCommitit = [{
      sha:    nykyinen.meta?.githubCommitSha ?? null,
      viesti: nykyinen.meta?.githubCommitMessage?.split("\n")[0] ?? "(ei tietoa)",
      pvm:    nykyinen.created ? new Date(nykyinen.created).toISOString() : null,
      tekija: null,
    }]
    const palautettavaSha = edellinen.meta?.githubCommitSha ?? null
    const { data: julkaisuRivi, error: insErr } = await supa
      .from("julkaisut")
      .insert({
        kayttaja_id:         user.id,
        toiminto:            "rollback",
        julkaistut_commitit: peruttavatCommitit,
        merge_sha:           palautettavaSha,
        vercel_deploy_id:    edellinen.uid,
        status:              "kaynnissa",
      })
      .select("id")
      .single()
    if (insErr || !julkaisuRivi) {
      return jsonResponse({ virhe: `Audit-loki: ${insErr?.message ?? "tuntematon"}` }, 500)
    }

    // 5) Vercel promote — määritä edellinen deployment uudeksi production-aliasiksi
    const promoteRes = await fetch(
      `https://api.vercel.com/v10/projects/${liveProjektId}/promote/${edellinen.uid}${teamSuffix}`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      }
    )

    if (!promoteRes.ok) {
      const txt = await promoteRes.text()
      const virhe = `Vercel promote epäonnistui (${promoteRes.status}): ${txt.slice(0, 200)}`
      await supa.from("julkaisut").update({
        status:    "epaonnistui",
        virhe,
        kesto_ms:  Date.now() - aloitusAika,
        paivitetty: new Date().toISOString(),
      }).eq("id", julkaisuRivi.id)
      return jsonResponse({ onnistui: false, virhe, julkaisuId: julkaisuRivi.id }, 502)
    }

    // 6) Päivitä audit-rivi onnistuneeksi
    await supa.from("julkaisut").update({
      status:     "valmis",
      kesto_ms:   Date.now() - aloitusAika,
      paivitetty: new Date().toISOString(),
    }).eq("id", julkaisuRivi.id)

    return jsonResponse({
      onnistui:        true,
      julkaisuId:      julkaisuRivi.id,
      vercelDeployId:  edellinen.uid,
      palautettuSha:   palautettavaSha,
    }, 200)

  } catch (e) {
    const viesti = e instanceof Error ? e.message : String(e)
    return jsonResponse({ virhe: `Sisäinen virhe: ${viesti}` }, 500)
  }
})
