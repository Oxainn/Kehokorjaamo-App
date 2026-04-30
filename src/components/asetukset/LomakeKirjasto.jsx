import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../services/supabase'
import LomakepohjaEditori from './LomakepohjaEditori'

const NAYTTOTYYLIT = {
  c:         'Osio kerrallaan',
  yksi_sivu: 'Kaikki osiot allekkain',
  accordion: 'Accordion-tyyli, klikkaus avaa',
}

function formattiPvm(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

// ── PohjaKortti ───────────────────────────────────────────────────────────────
// Valikkotila ja uudelleennimeäminen hallitaan komponenttipaikallisesti, jotta
// ulkopuolinen sulkumekanismi ei häiritse Reactin event delegation -arkkitehtuuria.

function PohjaKortti({ pohja, onRefresh, onAvaa, onKopioi, onAsetaOletus, onPoista }) {
  const [menuAuki, setMenuAuki] = useState(false)
  const [uudelleenNimi, setUudelleenNimi] = useState(null) // null = ei muokata
  const menuRef = useRef(null)

  // Sulje valikko klikkaamalla ulkopuolelle — mousedown ennen click-tapahtumaa
  useEffect(() => {
    if (!menuAuki) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAuki(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuAuki])

  async function tallennaNimi(nimi) {
    if (!nimi.trim()) { setUudelleenNimi(null); return }
    try {
      const { error } = await supabase
        .from('lomakepohjat').update({ nimi: nimi.trim() }).eq('id', pohja.id)
      if (error) throw error
      setUudelleenNimi(null)
      onRefresh()
    } catch (e) { alert('Nimeäminen epäonnistui: ' + e.message) }
  }

  async function toggleAktiivinen() {
    setMenuAuki(false)
    try {
      const { error } = await supabase
        .from('lomakepohjat').update({ aktiivinen: !pohja.aktiivinen }).eq('id', pohja.id)
      if (error) throw error
      onRefresh()
    } catch (e) { alert('Epäonnistui: ' + e.message) }
  }

  const tyyli = NAYTTOTYYLIT[pohja.viimeisinVersio?.rakenne?.nayttotyyli] || '—'

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${pohja.on_oletus ? 'border-amber-200' : 'border-gray-100'}`}>
      {/* Otsikkorivi */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          {uudelleenNimi !== null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={uudelleenNimi}
                onChange={e => setUudelleenNimi(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  tallennaNimi(uudelleenNimi)
                  if (e.key === 'Escape') setUudelleenNimi(null)
                }}
                autoFocus
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => tallennaNimi(uudelleenNimi)}
                className="text-xs text-brand-600 font-medium hover:text-brand-700"
              >
                Tallenna
              </button>
              <button
                type="button"
                onClick={() => setUudelleenNimi(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Peruuta
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{pohja.nimi}</span>
              {pohja.on_oletus && (
                <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                  ⭐ OLETUS
                </span>
              )}
              {!pohja.aktiivinen && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                  Ei aktiivinen
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">{tyyli}</p>
        </div>

        {/* Kolme pistettä — ref koko containerille jotta sisäklikkaus ei sulje */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuAuki(p => !p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors select-none"
            aria-label="Lisää toimintoja"
          >
            ···
          </button>
          {menuAuki && (
            <div className="absolute right-0 top-9 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => { setMenuAuki(false); setUudelleenNimi(pohja.nimi) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Nimeä uudelleen
              </button>
              <button
                type="button"
                onClick={toggleAktiivinen}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {pohja.aktiivinen ? 'Deaktivoi' : 'Aktivoi'}
              </button>
              {pohja.on_oletus ? (
                <button
                  type="button"
                  disabled
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 cursor-not-allowed"
                  title="Oletuspohjaa ei voi poistaa"
                >
                  Poista
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMenuAuki(false); onPoista(pohja) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Poista
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-gray-400">
        {pohja.aktiivinen ? 'Aktiivinen' : 'Ei aktiivinen'} · Päivitetty {formattiPvm(pohja.paivitetty || pohja.luotu)}
      </p>

      {/* Toimintonapit */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onAvaa(pohja)}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
        >
          Avaa
        </button>
        <button
          type="button"
          onClick={() => onKopioi(pohja)}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
        >
          Kopioi
        </button>
        {!pohja.on_oletus && (
          <button
            type="button"
            onClick={() => onAsetaOletus(pohja)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
          >
            Aseta oletukseksi
          </button>
        )}
      </div>
    </div>
  )
}

// ── Luo uusi -modaali ──────────────────────────────────────────────────────────

function LuoModaali({ tila, setTila, onLuo, lataa }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Luo uusi lomakepohja</h3>
          <button
            type="button"
            onClick={() => setTila(p => ({ ...p, auki: false }))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nimi *
            </label>
            <input
              type="text"
              value={tila.nimi}
              onChange={e => setTila(p => ({ ...p, nimi: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && tila.nimi.trim() && onLuo()}
              placeholder="Esim. Hieronta — Laajennettu"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Kuvaus (valinnainen)
            </label>
            <input
              type="text"
              value={tila.kuvaus}
              onChange={e => setTila(p => ({ ...p, kuvaus: e.target.value }))}
              placeholder="Lyhyt kuvaus"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Näyttötyyli
            </label>
            <select
              value={tila.nayttotyyli}
              onChange={e => setTila(p => ({ ...p, nayttotyyli: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              <option value="c">Osio kerrallaan (C-tyyli)</option>
              <option value="yksi_sivu">Kaikki osiot allekkain</option>
              <option value="accordion">Accordion-tyyli</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setTila(p => ({ ...p, auki: false }))}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={onLuo}
            disabled={lataa || !tila.nimi.trim()}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {lataa ? 'Luodaan…' : 'Luo pohja'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Avaa pohja -modaali ────────────────────────────────────────────────────────

function AvaaNakymaModaali({ pohja, versio, kentat, onSulje }) {
  const rakenne = versio?.rakenne
  const tyyli   = NAYTTOTYYLIT[rakenne?.nayttotyyli] || rakenne?.nayttotyyli || '—'
  const osiot   = rakenne?.osiot || []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">{pohja.nimi}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Näyttötyyli: {tyyli}</p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm font-medium text-gray-700">📋 Osiot tässä pohjassa:</p>
          {osiot.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Tämä pohja ei sisällä osioita vielä.</p>
          ) : (
            osiot.map((osio, i) => {
              const otsikko     = typeof osio.otsikko === 'object' ? osio.otsikko.fi : (osio.otsikko || osio.id)
              const kenttaLista = osio.kenttat || []
              const naytettavat = kenttaLista.slice(0, 5)
              const lisaaKpl    = kenttaLista.length - 5
              const hasRyhmat   = (osio.ryhmittelyt || []).length > 0

              return (
                <div key={osio.id} className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-gray-700">
                    {i + 1}. {otsikko} ({kenttaLista.length} kenttää)
                  </p>
                  <ul className="pl-4 flex flex-col gap-0.5">
                    {naytettavat.map(kf => {
                      const nimi = kentat[kf.kentta_id_tunniste] || kf.kentta_id_tunniste
                      return (
                        <li key={kf.kentta_id_tunniste} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="text-gray-300">•</span>
                          <span>{nimi}{kf.pakollinen ? ' *' : ''}</span>
                        </li>
                      )
                    })}
                    {lisaaKpl > 0 && (
                      <li className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="text-gray-200">•</span>
                        <span>+ {lisaaKpl} kenttää lisää{hasRyhmat ? ' (avattavissa ryhmissä)' : ''}</span>
                      </li>
                    )}
                    {lisaaKpl <= 0 && hasRyhmat && (
                      <li className="text-xs text-gray-400 italic pl-3">(avattavissa ryhmissä)</li>
                    )}
                  </ul>
                </div>
              )
            })
          )}
          <div className="mt-1 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">ⓘ Editorissa (vaihe C) voit muokata näitä.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Vahvistusmodaali ───────────────────────────────────────────────────────────

function VahvistusModaali({ vahvistus, lataa, onPeruuta, onVahvista }) {
  const onOletus = vahvistus.tyyppi === 'oletus'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl px-5 py-6 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-800">
          {onOletus ? 'Aseta oletuspohjana?' : 'Poista lomakepohja?'}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {onOletus
            ? `Aseta "${vahvistus.pohja.nimi}" oletukseksi? Uudet asiakkaat saavat tämän pohjan.`
            : `Poistetaanko "${vahvistus.pohja.nimi}"? Tätä ei voi peruuttaa.`}
        </p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onPeruuta}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={onVahvista}
            disabled={lataa}
            className={`px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
              onOletus ? 'bg-brand-600 hover:bg-brand-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {lataa ? 'Odota…' : onOletus ? 'Aseta oletukseksi' : 'Poista'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pääkomponentti ─────────────────────────────────────────────────────────────

export default function LomakeKirjasto() {
  const [pohjat,         setPohjat]         = useState([])
  const [lataa,          setLataa]          = useState(true)
  const [virhe,          setVirhe]          = useState(null)
  const [luoModaali,     setLuoModaali]     = useState({ auki: false, nimi: '', kuvaus: '', nayttotyyli: 'c' })
  const [luoLataa,       setLuoLataa]       = useState(false)
  const [avaaNakyma,     setAvaaNakyma]     = useState({ auki: false, pohja: null, versio: null, kentat: {} })
  const [vahvistus,      setVahvistus]      = useState(null)
  const [vahvistusLataa, setVahvistusLataa] = useState(false)
  const [editoitavaPohja, setEditoitavaPohja] = useState(null)

  useEffect(() => { haePohjat() }, [])

  async function haePohjat() {
    setLataa(true)
    setVirhe(null)
    try {
      const { data, error } = await supabase
        .from('lomakepohjat')
        .select('id, nimi, kuvaus, on_oletus, aktiivinen, luotu, paivitetty, lomakepohja_versiot(versio, rakenne, luotu)')
        .order('on_oletus', { ascending: false })
        .order('paivitetty', { ascending: false })
      if (error) throw error

      const enriched = (data || []).map(p => {
        const versiot   = (p.lomakepohja_versiot || []).sort((a, b) => b.versio - a.versio)
        const { lomakepohja_versiot: _, ...rest } = p
        return { ...rest, viimeisinVersio: versiot[0] || null }
      })
      setPohjat(enriched)
    } catch {
      setVirhe('Lomakepohjien lataus epäonnistui.')
    } finally {
      setLataa(false)
    }
  }

  async function haeHoitajaId() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Kirjautuminen vaaditaan')
    return user.id
  }

  async function luoPohja() {
    if (!luoModaali.nimi.trim()) return
    setLuoLataa(true)
    try {
      const hoitajaId = await haeHoitajaId()
      const { data: pohja, error: e1 } = await supabase
        .from('lomakepohjat')
        .insert({ hoitaja_id: hoitajaId, nimi: luoModaali.nimi.trim(), kuvaus: luoModaali.kuvaus.trim() || null, on_oletus: false, aktiivinen: true })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('lomakepohja_versiot')
        .insert({ pohja_id: pohja.id, versio: 1, rakenne: { formaatti_versio: 1, nayttotyyli: luoModaali.nayttotyyli, osiot: [] } })
      if (e2) throw e2

      setLuoModaali({ auki: false, nimi: '', kuvaus: '', nayttotyyli: 'c' })
      await haePohjat()
    } catch (e) {
      alert('Luonti epäonnistui: ' + e.message)
    } finally {
      setLuoLataa(false)
    }
  }

  async function kopioPohja(pohja) {
    try {
      const hoitajaId = await haeHoitajaId()
      const { data: uusi, error: e1 } = await supabase
        .from('lomakepohjat')
        .insert({ hoitaja_id: hoitajaId, nimi: pohja.nimi + ' (kopio)', kuvaus: pohja.kuvaus || null, on_oletus: false, aktiivinen: true })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('lomakepohja_versiot')
        .insert({ pohja_id: uusi.id, versio: 1, rakenne: pohja.viimeisinVersio?.rakenne || { formaatti_versio: 1, nayttotyyli: 'c', osiot: [] } })
      if (e2) throw e2

      await haePohjat()
    } catch (e) {
      alert('Kopiointi epäonnistui: ' + e.message)
    }
  }

  async function asetaOletus(pohja) {
    setVahvistusLataa(true)
    try {
      const { error: e1 } = await supabase.from('lomakepohjat').update({ on_oletus: false }).neq('id', pohja.id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('lomakepohjat').update({ on_oletus: true }).eq('id', pohja.id)
      if (e2) throw e2
      setVahvistus(null)
      await haePohjat()
    } catch (e) {
      alert('Oletuksen asetus epäonnistui: ' + e.message)
    } finally {
      setVahvistusLataa(false)
    }
  }

  async function poistaPohja(pohja) {
    setVahvistusLataa(true)
    try {
      const { error } = await supabase.from('lomakepohjat').delete().eq('id', pohja.id)
      if (error) throw error
      setVahvistus(null)
      await haePohjat()
    } catch (e) {
      alert('Poisto epäonnistui: ' + e.message)
    } finally {
      setVahvistusLataa(false)
    }
  }

  async function avaaPohjaNakyma(pohja) {
    try {
      const rakenne    = pohja.viimeisinVersio?.rakenne
      const tunnisteet = []
      for (const osio of rakenne?.osiot || [])
        for (const kf of osio.kenttat || [])
          if (kf.kentta_id_tunniste) tunnisteet.push(kf.kentta_id_tunniste)

      let kentatMap = {}
      if (tunnisteet.length > 0) {
        const { data, error } = await supabase
          .from('kenttakirjasto')
          .select('kentta_id_tunniste, kentan_versiot(versio, kaannokset)')
          .in('kentta_id_tunniste', tunnisteet)
        if (error) throw error

        for (const k of data || []) {
          const v = (k.kentan_versiot || []).sort((a, b) => b.versio - a.versio)[0]
          kentatMap[k.kentta_id_tunniste] = v?.kaannokset?.fi?.otsikko || k.kentta_id_tunniste
        }
      }
      setAvaaNakyma({ auki: true, pohja, versio: pohja.viimeisinVersio, kentat: kentatMap })
    } catch (e) {
      alert('Lataus epäonnistui: ' + e.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Editorinäkymä korvaa kirjaston kun pohja avataan muokattavaksi
  if (editoitavaPohja) {
    return (
      <LomakepohjaEditori
        pohja={editoitavaPohja}
        rakenne={editoitavaPohja.viimeisinVersio?.rakenne ?? { formaatti_versio: 1, nayttotyyli: 'c', osiot: [] }}
        onTallennettu={async () => {
          setEditoitavaPohja(null)
          await haePohjat()
        }}
        onPeruuta={() => setEditoitavaPohja(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Otsikko + Luo uusi */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 leading-relaxed">
          Hallitse lomakepohjia. Voit luoda eri palveluille omia versioita.
        </p>
        <button
          type="button"
          onClick={() => setLuoModaali({ auki: true, nimi: '', kuvaus: '', nayttotyyli: 'c' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          <span>+</span>
          <span>Luo uusi pohja</span>
        </button>
      </div>

      {lataa && <div className="text-sm text-gray-400 py-4 text-center">Ladataan…</div>}
      {virhe  && <div className="text-sm text-red-500 py-2">{virhe}</div>}

      {!lataa && pohjat.map(pohja => (
        <PohjaKortti
          key={pohja.id}
          pohja={pohja}
          onRefresh={haePohjat}
          onAvaa={(p) => setEditoitavaPohja(p)}
          onKopioi={kopioPohja}
          onAsetaOletus={p => setVahvistus({ tyyppi: 'oletus', pohja: p })}
          onPoista={p => setVahvistus({ tyyppi: 'poisto', pohja: p })}
        />
      ))}

      {luoModaali.auki && (
        <LuoModaali tila={luoModaali} setTila={setLuoModaali} onLuo={luoPohja} lataa={luoLataa} />
      )}

      {avaaNakyma.auki && (
        <AvaaNakymaModaali
          pohja={avaaNakyma.pohja}
          versio={avaaNakyma.versio}
          kentat={avaaNakyma.kentat}
          onSulje={() => setAvaaNakyma({ auki: false, pohja: null, versio: null, kentat: {} })}
        />
      )}

      {vahvistus && (
        <VahvistusModaali
          vahvistus={vahvistus}
          lataa={vahvistusLataa}
          onPeruuta={() => setVahvistus(null)}
          onVahvista={() =>
            vahvistus.tyyppi === 'oletus' ? asetaOletus(vahvistus.pohja) : poistaPohja(vahvistus.pohja)
          }
        />
      )}
    </div>
  )
}
