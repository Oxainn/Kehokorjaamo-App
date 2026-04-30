// Hoitajan palveluiden hallinta — kortit + luo/muokkaa-modaali.
// Käytetään lomake↔palvelu-linkityksessä editorissa.

import { useState, useEffect } from 'react'
import { haePalvelut, luoPalvelu, paivitaPalvelu, poistaPalvelu } from '../../lib/db'

const inputLuokka = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelLuokka = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

function PalveluModaali({ palvelu, onTallennettu, onSulje }) {
  const [nimi,         setNimi]         = useState(palvelu?.nimi             ?? '')
  const [kuvaus,       setKuvaus]       = useState(palvelu?.kuvaus           ?? '')
  const [kestoMin,     setKestoMin]     = useState(palvelu?.kesto_min        ?? '')
  const [hintaEur,     setHintaEur]     = useState(palvelu?.hinta_eur        ?? '')
  const [varauslinkki, setVarauslinkki] = useState(palvelu?.varauslinkki_url ?? '')
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
              placeholder="Esim. Kalevalainen jäsenkorjaus"
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

function PalveluKortti({ palvelu, onMuokkaa, onPoista, onToggleAktiivinen }) {
  return (
    <div className={`bg-white rounded-xl border ${palvelu.aktiivinen ? 'border-gray-100' : 'border-gray-200 bg-gray-50'} shadow-sm p-4 flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-800 text-sm">{palvelu.nimi}</h4>
            {!palvelu.aktiivinen && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Ei aktiivinen</span>
            )}
          </div>
          {palvelu.kuvaus && <p className="text-xs text-gray-500 mt-1">{palvelu.kuvaus}</p>}
          <p className="text-xs text-gray-400 mt-1">
            {palvelu.kesto_min ? `${palvelu.kesto_min} min` : 'Kesto ei tiedossa'}
            {' · '}
            {palvelu.hinta_eur != null ? `${palvelu.hinta_eur} €` : 'Hinta ei määritelty'}
            {palvelu.varauslinkki_url && (
              <>{' · '}<span className="text-brand-600">🔗 Varauslinkki asetettu</span></>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap pt-1">
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

export default function PalveluKirjasto() {
  const [palvelut, setPalvelut] = useState([])
  const [lataa,    setLataa]    = useState(true)
  const [virhe,    setVirhe]    = useState(null)
  const [muokattava, setMuokattava] = useState(null)  // null tai palvelu-objekti tai 'uusi'

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 leading-relaxed">
          Palvelut joita tarjoat asiakkaille. Liitetään lomakepohjiin editorissa.
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
            Klikkaa <strong>+ Lisää palvelu</strong> aloittaaksesi. Voit esimerkiksi lisätä jäsenkorjauksen, hieronnan tai energiahoidon.
            Palvelut linkitetään lomakepohjiin editorissa, ja niitä voidaan käyttää myöhemmin julkisessa ajanvarauksessa.
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
        />
      ))}

      {muokattava && (
        <PalveluModaali
          palvelu={muokattava === 'uusi' ? null : muokattava}
          onTallennettu={async () => { setMuokattava(null); await lataaPalvelut() }}
          onSulje={() => setMuokattava(null)}
        />
      )}
    </div>
  )
}
