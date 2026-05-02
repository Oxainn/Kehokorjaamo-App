// Versionhallinta-sivun ympäristö-konfiguraatio.
//
// Sisältää sekä Live- että Kehitys-ympäristön URLit ja git-haarat.
// Käytössä Versionhallinta.jsx-komponentissa joka näyttää molempien
// ympäristöjen tilan rinnakkain käyttäjän nykyisestä sijainnista
// riippumatta.
//
// HUOM: nimet, URLit ja Supabase-projekti-ID:t ovat julkista tietoa
// (ne paljastuvat URL:sta ja anon-keystä jokaisessa deploymentissa).
// Anon-keyt EI ole tässä — Versionhallinta käyttää ne ainoastaan oman
// ympäristönsä Supabasea, koska cross-env-kyselyt vaatisivat erillisen
// kirjautumisen / service-role-tokenin (D3-vaihe).

export const YMPARISTOT = {
  live: {
    nimi:               'LIVE',
    url:                'https://kehokorjaamo-app.vercel.app',
    githubBranch:       'main',
    supabaseProjektiId: 'uwysictfbzswecnxvmif',
    kuvaus:             'Tuotanto — asiakkaat käyttävät tätä',
    vari:               '#15803d',
    variBg:             '#dcfce7',
  },
  kehitys: {
    nimi:               'KEHITYS',
    url:                'https://kehokorjaamo-kehitys.vercel.app',
    githubBranch:       'kehitys',
    supabaseProjektiId: 'bnlxxymrutmdoksqoemz',
    kuvaus:             'Testi/rakentaminen — Liveen ei vaikuta',
    vari:               '#d97706',
    variBg:             '#fef3c7',
  },
}

export const GITHUB_REPO = 'Oxainn/Kehokorjaamo-App'

// GitHub API helpers — public repo, ei tokenia tarvita (60 req/h/IP)
export async function haeViimeisinCommit(branch) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${branch}`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`)
  const data = await res.json()
  return {
    sha:     data.sha,
    viesti:  data.commit?.message?.split('\n')[0] ?? '',
    pvm:     data.commit?.author?.date ?? null,
    tekija:  data.commit?.author?.name ?? '',
    htmlUrl: data.html_url,
  }
}

// Pingaa URL — selvittää vastaako serveri. Käytetään no-cors-moodia
// koska emme tarvitse vastauksen sisältöä (reagoidaan vain onnistuiko
// fetch). HTTP-statusta ei nähdä, mutta verkon yli-/alas-tila riittää.
export async function pingaaUrl(url, timeoutMs = 8000) {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await fetch(url, {
      method: 'GET',
      mode:   'no-cors',
      cache:  'no-store',
      signal: ctrl.signal,
    })
    return { ok: true, virhe: null }
  } catch (e) {
    return { ok: false, virhe: e.name === 'AbortError' ? 'aikakatkaisu' : (e.message ?? 'verkkovirhe') }
  } finally {
    clearTimeout(timeout)
  }
}

// Erot kahden haaran välillä — Kehityksessä commit X, ei vielä main:ssa
export async function haeErotHaarat(perusHaara, vertaaHaara) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/compare/${perusHaara}...${vertaaHaara}`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`)
  const data = await res.json()
  return (data.commits ?? []).map((c) => ({
    sha:     c.sha,
    viesti:  c.commit?.message?.split('\n')[0] ?? '',
    pvm:     c.commit?.author?.date ?? null,
    tekija:  c.commit?.author?.name ?? '',
    htmlUrl: c.html_url,
  }))
}
