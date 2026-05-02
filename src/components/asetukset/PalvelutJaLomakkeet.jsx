// Yhdistetty Palvelut & Lomakkeet -näkymä Asetuksiin.
// Palvelu-keskeinen: jokainen palvelu näyttää oman lomakkeen, ja "Vaihda"
// -napilla pääsee vaihtamaan toiseen pohjaan. Lomakepohjien yleishallinta
// (kopio, oletukseksi, poisto) löytyy alaosan "Hallitse lomakepohjia"
// -avattavasta paneelista.

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import {
  haePalvelut,
  luoPalvelu,
  paivitaPalvelu,
  poistaPalvelu,
  asetaPalvelunLomake,
} from '../../lib/db'
import LomakeKirjasto from './LomakeKirjasto'

const inputLuokka = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelLuokka = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

// ── Palvelu-modaali (luo / muokkaa) ─────────────────────────────────────────

function PalveluModaali({ palvelu, onTallennettu, onSulje }) {
  const [nimi,         setNimi]         = useState(palvelu?.nimi               ?? '')
  const [kuvaus,       setKuvaus]       = useState(palvelu?.kuvaus             ?? '')
  const [kestoMin,     setKestoMin]     = useState(palvelu?.kesto_min          ?? '')
  const [hintaEur,     setHintaEur]     = useState(palvelu?.hinta_eur          ?? '')
  const [varauslinkki, setVarauslinkki] = useState(palvelu?.varauslinkki_url   ?? '')
  const [tallentaa,    setTallentaa]    = useState(false)
  const [virhe,        setVirhe]        = useState(null)

  const onUusi = !palvelu

  async function tallenna() {
    if (!nimi.trim()) { setVirhe('Nimi puuttuu'); return }
    setTallentaa(true)
    setVirhe(null)
    try {
      const arvot = {
        nimi:             nimi.trim(),
        kuvaus:           kuvaus.trim() || null,
        kesto_min:        kestoMin === '' ? null : Number(kestoMin),
        hinta_eur:        hintaEur === '' ? null : Number(hintaEur),
        varauslinkki_url: varauslinkki.trim() || null,
      }
      const tulos = onUusi
        ? await luoPalvelu(arvot)
        : await paivitaPalvelu(palvelu.id, arvot)
      if (tulos.virhe) { setVirhe(tulos.virhe); return }
      onTallennettu()
    } catch (e) {
      setVirhe(e.message ?? 'Tallennus epäonnistui')
    } finally {
      setTallentaa(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {onUusi ? 'Lisää palvelu' : 'Muokkaa palvelua'}
          </h3>
          <button
            type="button"
            onClick={onSulje}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Palvelun nimi *</label>
            <input
              type="text"
              value={nimi}
              onChange={(e) => setNimi(e.target.value)}
              placeholder="Esim. Kalevalainen jäsenkorjaus 1. hoitokerta"
              className={inputLuokka}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Kuvaus (valinnainen)</label>
            <textarea
              value={kuvaus}
              onChange={(e) => setKuvaus(e.target.value)}
              placeholder="Lyhyt kuvaus mitä palvelu sisältää"
              rows={3}
              className={`${inputLuokka} resize-y`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelLuokka}>Kesto (min)</label>
              <input
                type="number"
                value={kestoMin}
                onChange={(e) => setKestoMin(e.target.value)}
                placeholder="60"
                min="1"
                className={inputLuokka}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelLuokka}>Hinta (€)</label>
              <input
                type="number"
                value={hintaEur}
                onChange={(e) => setHintaEur(e.target.value)}
                placeholder="80"
                min="0"
                step="0.01"
                className={inputLuokka}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Varauslinkki (Vello tai vastaava)</label>
            <input
              type="url"
              value={varauslinkki}
              onChange={(e) => setVarauslinkki(e.target.value)}
              placeholder="https://vello.fi/oxain/jasenkorjaus"
              className={inputLuokka}
            />
            <p className="text-xs text-gray-500">
              Avataan uudessa välilehdessä julkisen lomakkeen lähetyksen jälkeen.
            </p>
          </div>

          {virhe && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {virhe}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onSulje}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={tallenna}
            disabled={tallentaa || !nimi.trim()}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {tallentaa ? 'Tallennetaan…' : (onUusi ? 'Lisää palvelu' : 'Tallenna')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vaihda lomake -modaali ──────────────────────────────────────────────────

function VaihdaLomakeModaali({ palvelu, nykyinenPohjaId, onTallennettu, onSulje }) {
  const [pohjat,     setPohjat]     = useState([])
  const [valittu,    setValittu]    = useState(nykyinenPohjaId ?? '')
  const [lataa,      setLataa]      = useState(true)
  const [virhe,      setVirhe]      = useState(null)
  const [tallentaa,  setTallentaa]  = useState(false)

  useEffect(() => {
    let peruttu = false
    setLataa(true)
    supabase
      .from('lomakepohjat')
      .select('id, nimi, aktiivinen, kuvaus')
      .eq('aktiivinen', true)
      .order('nimi')
      .then(({ data, error }) => {
        if (peruttu) return
        if (error) setVirhe(error.message)
        else setPohjat(data ?? [])
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [])

  async function tallenna() {
    setTallentaa(true)
    setVirhe(null)
    const tulos = await asetaPalvelunLomake(palvelu.id, valittu || null)
    if (tulos.virhe) {
      setVirhe(tulos.virhe)
      setTallentaa(false)
      return
    }
    onTallennettu()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Valitse lomake</h3>
            <p className="text-xs text-gray-500 mt-0.5">{palvelu.nimi}</p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {lataa && <p className="text-sm text-gray-400 italic text-center py-4">Ladataan pohjia…</p>}

          {!lataa && pohjat.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-amber-900 mb-1">Ei aktiivisia lomakepohjia</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Luo ensin lomakepohja Asetukset → Lomakepohjat -osasta.
              </p>
            </div>
          )}

          {!lataa && pohjat.length > 0 && (
            <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              <li>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${valittu === '' ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="lomakepohja"
                    checked={valittu === ''}
                    onChange={() => setValittu('')}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">— Ei lomaketta —</p>
                    <p className="text-xs text-gray-500 mt-0.5">Asiakas ei voi täyttää esitietolomaketta tähän palveluun.</p>
                  </div>
                </label>
              </li>
              {pohjat.map((p) => (
                <li key={p.id}>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${valittu === p.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="lomakepohja"
                      checked={valittu === p.id}
                      onChange={() => setValittu(p.id)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{p.nimi}</p>
                      {p.kuvaus && <p className="text-xs text-gray-500 mt-0.5">{p.kuvaus}</p>}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {virhe && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {virhe}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onSulje}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={tallenna}
            disabled={tallentaa || lataa}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {tallentaa ? 'Tallennetaan…' : 'Vahvista'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Palvelukortti ───────────────────────────────────────────────────────────

function PalveluKortti({ palvelu, onMuokkaa, onPoista, onToggleAktiivinen, onVaihdaLomake }) {
  const lomake = palvelu.lomakepohja
  const [kopiointiTila, setKopiointiTila] = useState(null) // null | 'ok' | 'virhe'

  // Asiakaslinkki on aina nykyisen alkuperäosoitteen pohjalta — kun deployataan
  // uuteen domainiin, linkki seuraa automaattisesti.
  const asiakasLinkki = typeof window !== 'undefined'
    ? `${window.location.origin}/?palvelu=${palvelu.id}`
    : `/?palvelu=${palvelu.id}`

  async function kopioiLinkki() {
    try {
      await navigator.clipboard.writeText(asiakasLinkki)
      setKopiointiTila('ok')
    } catch {
      setKopiointiTila('virhe')
    }
    setTimeout(() => setKopiointiTila(null), 2000)
  }

  return (
    <div className={`bg-white rounded-xl border ${palvelu.aktiivinen ? 'border-gray-100' : 'border-gray-200 bg-gray-50'} shadow-sm p-4 flex flex-col gap-3`}>
      {/* Otsikko */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">🩺</span>
            <h4 className="font-semibold text-gray-800 text-sm">{palvelu.nimi}</h4>
            {!palvelu.aktiivinen && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Ei aktiivinen</span>
            )}
          </div>
          {palvelu.kuvaus && <p className="text-xs text-gray-500 mt-1 ml-7">{palvelu.kuvaus}</p>}
          <p className="text-xs text-gray-500 mt-1 ml-7">
            {palvelu.kesto_min ? `${palvelu.kesto_min} min` : 'Kesto ei tiedossa'}
            {' · '}
            {palvelu.hinta_eur != null ? `${palvelu.hinta_eur} €` : 'Hinta ei määritelty'}
          </p>
        </div>
      </div>

      {/* Lomake-rivi */}
      <div className="ml-7 flex items-center gap-2 flex-wrap rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">Lomake:</span>
        {lomake ? (
          <span className="text-sm text-gray-800 font-medium flex items-center gap-1.5">
            📋 {lomake.nimi}
            {!lomake.aktiivinen && <span className="text-xs text-amber-600" title="Pohja ei aktiivinen">⚠ ei aktiivinen</span>}
          </span>
        ) : (
          <span className="text-sm text-amber-700 italic">Ei lomaketta valittu</span>
        )}
        <button
          type="button"
          onClick={() => onVaihdaLomake(palvelu)}
          className="ml-auto px-3 py-1 text-xs font-medium text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 rounded-md transition-colors whitespace-nowrap"
        >
          {lomake ? 'Vaihda' : 'Valitse'}
        </button>
      </div>

      {/* Asiakaslinkki — luettava ja kopioitava */}
      <div className="ml-7 flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-500">Asiakaslinkki:</p>
        <div className="flex items-stretch gap-2 flex-wrap">
          <input
            type="text"
            value={asiakasLinkki}
            readOnly
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            aria-label="Asiakkaalle jaettava linkki tähän palveluun"
          />
          <button
            type="button"
            onClick={kopioiLinkki}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              kopiointiTila === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : kopiointiTila === 'virhe'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-brand-500 hover:text-brand-700'
            }`}
            aria-live="polite"
          >
            {kopiointiTila === 'ok' ? (
              <><span>✓</span><span>Kopioitu!</span></>
            ) : kopiointiTila === 'virhe' ? (
              <><span>⚠</span><span>Ei onnistunut</span></>
            ) : (
              <><span>📋</span><span>Kopioi</span></>
            )}
          </button>
        </div>
      </div>

      {/* Varauslinkki */}
      {palvelu.varauslinkki_url && (
        <p className="ml-7 text-xs text-gray-500">
          🔗 Varauslinkki asetettu
        </p>
      )}

      {/* Toiminnot */}
      <div className="ml-7 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onMuokkaa(palvelu)}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
        >
          Muokkaa
        </button>
        <button
          type="button"
          onClick={() => onToggleAktiivinen(palvelu)}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
        >
          {palvelu.aktiivinen ? 'Deaktivoi' : 'Aktivoi'}
        </button>
        <button
          type="button"
          onClick={() => onPoista(palvelu)}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
        >
          Poista
        </button>
      </div>
    </div>
  )
}

// ── Pää-komponentti ─────────────────────────────────────────────────────────

export default function PalvelutJaLomakkeet() {
  const [palvelut,        setPalvelut]        = useState([])
  const [lataa,           setLataa]           = useState(true)
  const [virhe,           setVirhe]           = useState(null)
  const [muokattava,      setMuokattava]      = useState(null)        // null tai palvelu tai 'uusi'
  const [vaihtoModaali,   setVaihtoModaali]   = useState(null)        // null tai palvelu
  const [pohjatAuki,      setPohjatAuki]      = useState(false)       // alaosan pohjien hallinta

  async function lataaPalvelut() {
    setLataa(true)
    setVirhe(null)
    try {
      const lista = await haePalvelut()
      setPalvelut(lista)
    } catch (e) {
      setVirhe('Palveluiden lataus epäonnistui: ' + (e.message ?? 'tuntematon virhe'))
    } finally {
      setLataa(false)
    }
  }

  useEffect(() => { lataaPalvelut() }, [])

  async function poista(palvelu) {
    if (!window.confirm(`Poistetaanko palvelu "${palvelu.nimi}"? Tätä ei voi peruuttaa.`)) return
    const tulos = await poistaPalvelu(palvelu.id)
    if (tulos.virhe) { alert('Poisto epäonnistui: ' + tulos.virhe); return }
    await lataaPalvelut()
  }

  async function toggleAktiivinen(palvelu) {
    const tulos = await paivitaPalvelu(palvelu.id, { aktiivinen: !palvelu.aktiivinen })
    if (tulos.virhe) { alert('Päivitys epäonnistui: ' + tulos.virhe); return }
    await lataaPalvelut()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Palvelut-lista */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 leading-relaxed">
          Jokainen palvelu käyttää yhtä lomaketta. Sama lomake voi olla useassa palvelussa.
        </p>
        <button
          type="button"
          onClick={() => setMuokattava('uusi')}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          <span>+</span>
          <span>Lisää palvelu</span>
        </button>
      </div>

      {lataa && <div className="text-sm text-gray-400 py-4 text-center">Ladataan…</div>}
      {virhe && <div className="text-sm text-red-500 py-2">{virhe}</div>}

      {!lataa && palvelut.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center flex flex-col gap-2 items-center">
          <span className="text-3xl">🏥</span>
          <p className="text-sm font-semibold text-amber-900">Et ole vielä luonut palveluita</p>
          <p className="text-sm text-amber-800 leading-relaxed max-w-md">
            Klikkaa <strong>+ Lisää palvelu</strong> aloittaaksesi. Voit esimerkiksi lisätä jäsenkorjauksen,
            hieronnan tai energiahoidon. Jokaiselle palvelulle valitset oman lomakkeen.
          </p>
        </div>
      )}

      {!lataa && palvelut.map((p) => (
        <PalveluKortti
          key={p.id}
          palvelu={p}
          onMuokkaa={(palvelu) => setMuokattava(palvelu)}
          onPoista={poista}
          onToggleAktiivinen={toggleAktiivinen}
          onVaihdaLomake={(palvelu) => setVaihtoModaali(palvelu)}
        />
      ))}

      {/* Lomakepohjien yleishallinta — avattava paneeli */}
      <div className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setPohjatAuki((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-sm font-semibold text-gray-700">Hallitse lomakepohjia</span>
            <span className="text-xs text-gray-400">(luo, muokkaa, kopioi)</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${pohjatAuki ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {pohjatAuki && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            <LomakeKirjasto />
          </div>
        )}
      </div>

      {/* Modaalit */}
      {muokattava && (
        <PalveluModaali
          palvelu={muokattava === 'uusi' ? null : muokattava}
          onTallennettu={async () => { setMuokattava(null); await lataaPalvelut() }}
          onSulje={() => setMuokattava(null)}
        />
      )}

      {vaihtoModaali && (
        <VaihdaLomakeModaali
          palvelu={vaihtoModaali}
          nykyinenPohjaId={vaihtoModaali.lomakepohja_id ?? null}
          onTallennettu={async () => { setVaihtoModaali(null); await lataaPalvelut() }}
          onSulje={() => setVaihtoModaali(null)}
        />
      )}
    </div>
  )
}
