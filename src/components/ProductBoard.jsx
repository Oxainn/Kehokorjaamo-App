import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kehokorjaamo_productboard'
const VERSIO = 'V1'

const OLETUS_VISIO =
  'Kehokorjaamo App on jäsenkorjaajan ammatillinen työkalu kehon tasapainon ' +
  'kartoittamiseen ja hoitosuunnitelman rakentamiseen. Lantio on kaiken keskiössä.'

const PRIORITEETIT = [
  { id: 'korkea', label: 'Korkea', ikoni: '🔴', kehys: 'border-red-200',    bg: 'bg-red-50',    teksti: 'text-red-700'    },
  { id: 'keski',  label: 'Keski',  ikoni: '🟡', kehys: 'border-yellow-200', bg: 'bg-yellow-50', teksti: 'text-yellow-700' },
  { id: 'matala', label: 'Matala', ikoni: '🟢', kehys: 'border-green-200',  bg: 'bg-green-50',  teksti: 'text-green-700'  },
]

const OLETUS_TEHTÄVÄT = [
  { id: 'dt-k1', teksti: 'Esitietolomakkeen brändäys (logo, värit)',              prioriteetti: 'korkea', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-k3', teksti: 'Supabase-tallennus pilveen',                            prioriteetti: 'korkea', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-k4', teksti: 'Lihaskartat hoitosuunnitelmaan',                        prioriteetti: 'korkea', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-k5', teksti: 'Kehonkuvan pisteet oikeille kohdille',                  prioriteetti: 'korkea', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m2', teksti: 'Hoitokertojen historia ja seuranta',                    prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m3', teksti: 'Ennen/jälkeen vertailu käyntien välillä',               prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m4', teksti: 'Automaattinen Claude API ilman kopioi/liitä',           prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m5', teksti: 'Hoitosuunnitelman tulostus PDF',                        prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m6', teksti: 'Henkilökohtainen itsehoito-PDF sähköpostilla',          prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m7', teksti: 'Harjoituskirjasto kuvilla ja ohjeilla',                 prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-m8', teksti: 'Asetukset-välilehden viimeistely',                      prioriteetti: 'keski',  lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l1', teksti: 'Asiakasportaali omille tiedoille',                      prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l2', teksti: 'Monivuokrausmalli muille terapeuteille',                prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l3', teksti: 'Lomakerakentaja hoitajalle',                            prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l4', teksti: 'Stripe-laskutus maksulliseen versioon',                 prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l5', teksti: 'Markkinointisivu kehokorjaamo.fi',                      prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
  { id: 'dt-l6', teksti: 'Onboarding uudelle käyttäjälle',                        prioriteetti: 'matala', lisätty: '2026-04-25T00:00:00.000Z' },
]

// Tehtävät jotka on valmistunut — poistetaan olemassa olevista listoista
const VALMISTUNEET_IDT = new Set(['dt-m1', 'dt-k2'])

const OLETUS_CHANGELOG = [
  { id: 'cl-1', teksti: 'Asiakastietolomake',                                  valmistunut: '2026-03-01T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-2', teksti: 'Esitietolomake + Vello-integraatio',                  valmistunut: '2026-03-10T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-3', teksti: 'Kehon kartoitus ammatillisella rakenteella',          valmistunut: '2026-03-15T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-4', teksti: 'Hoitosuunnitelma Claude-sillalla',                    valmistunut: '2026-03-20T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-5', teksti: 'Piirtoalusta kehokuvaan',                             valmistunut: '2026-04-01T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-6', teksti: 'GitHub + Vercel automaattideploy',                    valmistunut: '2026-04-10T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-7', teksti: 'Allergia-lisätietokenttä terveystietoihin',           valmistunut: '2026-04-25T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-8', teksti: 'Lomakkeiden validointi ja virheilmoitukset',          valmistunut: '2026-04-25T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-9', teksti: 'Koodaajan ideat liitetään suoraan sovellukseen',      valmistunut: '2026-04-25T00:00:00.000Z', versio: 'V1' },
  { id: 'cl-10', teksti: 'Lomakkeiden tulostus / PDF-vienti (window.print)',   valmistunut: '2026-04-25T00:00:00.000Z', versio: 'V1' },
]

function luePB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function pvm(iso) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    day: 'numeric', month: 'numeric', year: 'numeric',
  })
}

function AccordionOsio({ id, otsikko, ikoni, badge, auki, onToggle, lapset }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{ikoni}</span>
          <span className="font-semibold text-gray-800 text-sm">{otsikko}</span>
          {badge > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${auki ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {auki && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="flex flex-col gap-4 pt-4">{lapset}</div>
        </div>
      )}
    </div>
  )
}

export default function ProductBoard() {
  const [aukiOsio, setAukiOsio] = useState('visio')
  const [pb, setPb] = useState(() => {
    const s = luePB()
    return {
      visio:     s.visio     ?? OLETUS_VISIO,
      ideat:     s.ideat     ?? [],
      tehtävät:  s.tehtävät  ?? OLETUS_TEHTÄVÄT,
      changelog: s.changelog ?? OLETUS_CHANGELOG,
    }
  })

  const [visioTallennettu, setVisioTallennettu] = useState(false)
  const [kopioituId, setKopioituId]     = useState(null)
  const [uusiIdea, setUusiIdea]         = useState('')
  const [ideaInput, setIdeaInput]       = useState('')
  const [lisättyVahvistus, setLisättyVahvistus] = useState('')
  const [uusiTehtävä, setUusiTehtävä]   = useState('')
  const [uusiPrio, setUusiPrio]         = useState('keski')
  const [uusiCL, setUusiCL]             = useState('')
  const [uusiCLVersio, setUusiCLVersio] = useState(VERSIO)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pb))
  }, [pb])

  // Injektoi uudet system-entryt, poista valmistuneet, kerran mountissa
  useEffect(() => {
    setPb(prev => {
      const clIdt   = new Set(prev.changelog.map(c => c.id))
      const tehtIdt = new Set(prev.tehtävät.map(t => t.id))
      const uudetCL   = OLETUS_CHANGELOG.filter(e => !clIdt.has(e.id))
      const uudetTeht = OLETUS_TEHTÄVÄT.filter(t => !tehtIdt.has(t.id))
      const poistettavia = prev.tehtävät.some(t => VALMISTUNEET_IDT.has(t.id))
      if (uudetCL.length === 0 && uudetTeht.length === 0 && !poistettavia) return prev
      return {
        ...prev,
        changelog: uudetCL.length > 0 ? [...prev.changelog, ...uudetCL] : prev.changelog,
        tehtävät: [
          ...prev.tehtävät.filter(t => !VALMISTUNEET_IDT.has(t.id)),
          ...uudetTeht,
        ],
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setAukiOsio(prev => prev === id ? null : id)

  // ── Visio ────────────────────────────────────────────────────────────────
  const tallennaVisio = () => {
    setVisioTallennettu(true)
    setTimeout(() => setVisioTallennettu(false), 2000)
  }

  // ── Ideat ────────────────────────────────────────────────────────────────
  const lisääIdea = () => {
    if (!uusiIdea.trim()) return
    setPb(prev => ({
      ...prev,
      ideat: [...prev.ideat, {
        id: uid(), teksti: uusiIdea.trim(),
        lisätty: new Date().toISOString(), tila: 'idea',
      }],
    }))
    setUusiIdea('')
  }

  const poistaIdea = (id) =>
    setPb(prev => ({ ...prev, ideat: prev.ideat.filter(i => i.id !== id) }))

  const siirräToDohon = (idea) =>
    setPb(prev => ({
      ...prev,
      ideat: prev.ideat.filter(i => i.id !== idea.id),
      tehtävät: [...prev.tehtävät, {
        id: uid(), teksti: idea.teksti,
        prioriteetti: 'keski', lisätty: new Date().toISOString(),
      }],
    }))

  // ── Tehtävät ─────────────────────────────────────────────────────────────
  const lisääTehtävä = () => {
    if (!uusiTehtävä.trim()) return
    setPb(prev => ({
      ...prev,
      tehtävät: [...prev.tehtävät, {
        id: uid(), teksti: uusiTehtävä.trim(),
        prioriteetti: uusiPrio, lisätty: new Date().toISOString(),
      }],
    }))
    setUusiTehtävä('')
    setUusiPrio('keski')
  }

  const merkitseValmis = (t) =>
    setPb(prev => ({
      ...prev,
      tehtävät: prev.tehtävät.filter(x => x.id !== t.id),
      changelog: [...prev.changelog, {
        id: uid(), teksti: t.teksti,
        valmistunut: new Date().toISOString(), versio: VERSIO,
      }],
    }))

  const poistaTehtävä = (id) =>
    setPb(prev => ({ ...prev, tehtävät: prev.tehtävät.filter(t => t.id !== id) }))

  const rakennaPrompti = (tehtävä) => {
    const prioLabel = PRIORITEETIT.find(p => p.id === tehtävä.prioriteetti)?.label ?? tehtävä.prioriteetti
    return `TÄRKEÄÄ: Tee kaikki muutokset loppuun ja push suoraan mainiin. Älä luo Pull Requestia.

Kehokorjaamo App — toteuta seuraava tehtävä:

TEHTÄVÄ: ${tehtävä.teksti}
PRIORITEETTI: ${prioLabel}

Tee seuraavat asiat järjestyksessä:

1. TOTEUTA muutos — kirjoita tai muokkaa tarvittavat tiedostot

2. TARKISTA toimintaketju — varmista että:
   - Muutos toimii yksin
   - Muutos toimii yhdessä muiden komponenttien kanssa
   - Tiedonsiirto toimii läpi koko ketjun
     (esim. esitiedot → asiakaslomake → hoitosuunnitelma → jälkihoito)
   - Mobiili ja tablet toimivat

3. TESTAA reunatapaukset:
   - Mitä jos kentät ovat tyhjiä?
   - Mitä jos data puuttuu?
   - Mitä jos käyttäjä peruuttaa?

4. EHDOTA jatkokehitystä:
   - Mitä hyödyllisiä lisäominaisuuksia tähän voisi liittää?
   - Mitä muita komponentteja tämä muutos saattaa vaatia päivitystä?
   - Onko tässä tietoturva tai käytettävyyshuomioita?

5. TEE COMMIT selkeällä viestillä ja push mainiin

6. EHDOTA IDEOITA SOVELLUKSEEN:
   Listaa 2-4 konkreettista kehitysideaa jotka liittyvät tähän muutokseen.
   Kirjoita ideat TÄSMÄLLEEN tässä muodossa jotta ne voidaan liittää suoraan sovellukseen — ei teknistä jargonia, selkokielellä:

   IDEAT_ALKAA
   - Idea yksi selkokielellä
   - Idea kaksi selkokielellä
   - Idea kolme selkokielellä
   IDEAT_LOPPUU

Projektin konteksti:
- React + Vite + Tailwind
- Vercel hosting
- LocalStorage tallennus (Supabase tulossa)
- Käytetään tabletilla vastaanotolla
- Suomenkielinen UI`
  }

  const lisääIdeatTekstistä = () => {
    const teksti = ideaInput.trim()
    if (!teksti) return
    const alku  = teksti.indexOf('IDEAT_ALKAA')
    const loppu = teksti.indexOf('IDEAT_LOPPUU')
    let rivit = []
    if (alku !== -1 && loppu !== -1 && loppu > alku) {
      rivit = teksti
        .slice(alku + 'IDEAT_ALKAA'.length, loppu)
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.startsWith('- '))
        .map(r => r.slice(2).trim())
        .filter(Boolean)
    } else {
      rivit = teksti
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.startsWith('- '))
        .map(r => r.slice(2).trim())
        .filter(Boolean)
    }
    if (rivit.length === 0) return
    const uudet = rivit.map(r => ({
      id: uid(), teksti: r,
      lisätty: new Date().toISOString(), tila: 'idea',
    }))
    setPb(prev => ({ ...prev, ideat: [...prev.ideat, ...uudet] }))
    setIdeaInput('')
    setLisättyVahvistus(`Lisätty ${rivit.length} ideaa!`)
    setTimeout(() => setLisättyVahvistus(''), 3000)
  }

  const kopioi = (t) => {
    navigator.clipboard.writeText(rakennaPrompti(t)).then(() => {
      setKopioituId(t.id)
      setTimeout(() => setKopioituId(null), 2000)
    })
  }

  // ── Changelog ────────────────────────────────────────────────────────────
  const lisääCL = () => {
    if (!uusiCL.trim()) return
    setPb(prev => ({
      ...prev,
      changelog: [...prev.changelog, {
        id: uid(), teksti: uusiCL.trim(),
        valmistunut: new Date().toISOString(),
        versio: uusiCLVersio || VERSIO,
        manuaalinen: true,
      }],
    }))
    setUusiCL('')
  }

  const poistaCL = (id) =>
    setPb(prev => ({ ...prev, changelog: prev.changelog.filter(c => c.id !== id) }))

  // ── Sorted views ─────────────────────────────────────────────────────────
  const prioJärjestys = { korkea: 0, keski: 1, matala: 2 }
  const järjestetytTehtävät  = [...pb.tehtävät].sort(
    (a, b) => prioJärjestys[a.prioriteetti] - prioJärjestys[b.prioriteetti]
  )
  const järjestettyChangelog = [...pb.changelog].sort(
    (a, b) => new Date(b.valmistunut) - new Date(a.valmistunut)
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Product Board</h2>
        <p className="mt-1 text-gray-500 text-sm">Visio, ideat, tehtävät ja muutosloki.</p>
      </div>

      {/* ── 1: Visio ja periaatteet ──────────────────────────────────────── */}
      <AccordionOsio
        id="visio" otsikko="Visio ja periaatteet" ikoni="🎯"
        auki={aukiOsio === 'visio'} onToggle={toggle}
        lapset={
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Kehokorjaamo App — Visio
              </label>
              <textarea
                value={pb.visio}
                onChange={e => setPb(prev => ({ ...prev, visio: e.target.value }))}
                rows={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={tallennaVisio}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                Tallenna
              </button>
              {visioTallennettu && (
                <span className="text-sm text-green-600 font-medium">Tallennettu!</span>
              )}
            </div>
          </>
        }
      />

      {/* ── 2: Koodaajan kehitys- ja korjausideat ──────────────────────── */}
      <AccordionOsio
        id="ideat" otsikko="Koodaajan kehitys- ja korjausideat" ikoni="💡"
        badge={pb.ideat.length} auki={aukiOsio === 'ideat'} onToggle={toggle}
        lapset={
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={uusiIdea}
                onChange={e => setUusiIdea(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lisääIdea()}
                placeholder="Kirjoita uusi idea..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={lisääIdea}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                + Lisää idea
              </button>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Liitä Coden ehdotukset
              </p>
              <textarea
                value={ideaInput}
                onChange={e => setIdeaInput(e.target.value)}
                placeholder="Liitä tähän Coden ehdotukset..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={lisääIdeatTekstistä}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Lisää ideat
                </button>
                {lisättyVahvistus && (
                  <span className="text-sm text-green-600 font-medium">{lisättyVahvistus}</span>
                )}
              </div>
            </div>

            {pb.ideat.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Ei ideoita vielä.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pb.ideat.map(idea => (
                  <li
                    key={idea.id}
                    className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{idea.teksti}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{pvm(idea.lisätty)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => siirräToDohon(idea)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap transition-colors"
                      >
                        Siirrä To Dohon
                      </button>
                      <button
                        type="button"
                        onClick={() => poistaIdea(idea.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Poista
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      />

      {/* ── 3: To Do ─────────────────────────────────────────────────────── */}
      <AccordionOsio
        id="todo" otsikko="To Do" ikoni="📋"
        badge={pb.tehtävät.length} auki={aukiOsio === 'todo'} onToggle={toggle}
        lapset={
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={uusiTehtävä}
                onChange={e => setUusiTehtävä(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lisääTehtävä()}
                placeholder="Uusi tehtävä..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                {PRIORITEETIT.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    onClick={() => setUusiPrio(p.id)}
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm transition-colors ${
                      uusiPrio === p.id
                        ? `${p.kehys} ${p.bg} ${p.teksti}`
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p.ikoni}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={lisääTehtävä}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  + Lisää
                </button>
              </div>
            </div>

            {järjestetytTehtävät.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Ei tehtäviä.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {järjestetytTehtävät.map(t => {
                  const p = PRIORITEETIT.find(x => x.id === t.prioriteetti)
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <button
                        type="button"
                        onClick={() => merkitseValmis(t)}
                        title="Merkitse valmiiksi"
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center text-xs text-green-600 font-bold"
                      >
                        ✓
                      </button>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${p.bg} ${p.teksti}`}>
                        {p.ikoni} {p.label}
                      </span>
                      <span className="flex-1 text-sm text-gray-800 min-w-0">{t.teksti}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => kopioi(t)}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                            kopioituId === t.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700'
                          }`}
                        >
                          {kopioituId === t.id ? 'Kopioitu!' : 'Kopioi promptina'}
                        </button>
                        <button
                          type="button"
                          onClick={() => poistaTehtävä(t.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Poista
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        }
      />

      {/* ── 4: Changelog ─────────────────────────────────────────────────── */}
      <AccordionOsio
        id="changelog" otsikko="Changelog" ikoni="📝"
        badge={pb.changelog.length} auki={aukiOsio === 'changelog'} onToggle={toggle}
        lapset={
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={uusiCL}
                onChange={e => setUusiCL(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lisääCL()}
                placeholder="Lisää merkintä manuaalisesti..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <input
                type="text"
                value={uusiCLVersio}
                onChange={e => setUusiCLVersio(e.target.value)}
                className="w-20 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={lisääCL}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Lisää
              </button>
            </div>

            {järjestettyChangelog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Ei merkintöjä vielä.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {järjestettyChangelog.map(c => (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{c.teksti}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{pvm(c.valmistunut)}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                          {c.versio}
                        </span>
                        {c.manuaalinen && (
                          <span className="text-xs text-gray-400 italic">manuaalinen</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => poistaCL(c.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      Poista
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      />
    </div>
  )
}
