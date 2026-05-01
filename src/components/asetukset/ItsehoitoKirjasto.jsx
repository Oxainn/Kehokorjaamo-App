// Vaihe B Pala B5 — Itsehoito-kirjasto editorinäkymä Asetuksiin.
//
// Hoitaja ylläpitää yleisten harjoitusten varastoa josta Pala B6:ssa
// valitaan asiakkaan henkilökohtaiseen ohjelmaan.
//
// UI:
//   - Hakukenttä + alueittain pillerisuodatin + "+ Uusi harjoitus" -nappi
//   - Lista olemassa olevia harjoituksia (inline-laajennus muokattavaksi)
//   - "Arkistoi"-nappi rivin oikealla puolella
//   - "Arkistoidut"-välilehti palauta-napilla

import { useState, useEffect, useMemo } from 'react'
import {
  haeItsehoitoKirjasto,
  luoItsehoitoHarjoitus,
  paivitaItsehoitoHarjoitus,
} from '../../lib/db'

// Vakioalueet — käytetään checkbox-listana muokkausnäkymässä
const ALUEET = [
  'niska', 'hartiat', 'kaularanka', 'rintaranka', 'lanneranka',
  'lantio', 'SI-nivel', 'polvi', 'alaraajat', 'jalkaterät',
  'yläraajat', 'ranne', 'leukanivel', 'pää', 'koko keho',
]

const inputLuokka = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full'
const labelLuokka = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

const TYHJÄ_HARJOITUS = {
  nimi: '', lyhyt_kuvaus: '', pitka_ohje: '',
  kohdealueet: [], kesto_min: '', toistot: '',
  frekvenssi: '', varoitukset: '', kuva_url: '', video_url: '',
}

function HarjoitusEditori({ harjoitus, onTallennettu, onPeru }) {
  const [tila, setTila] = useState({
    nimi:         harjoitus?.nimi         ?? '',
    lyhyt_kuvaus: harjoitus?.lyhyt_kuvaus ?? '',
    pitka_ohje:   harjoitus?.pitka_ohje   ?? '',
    kohdealueet:  harjoitus?.kohdealueet  ?? [],
    kesto_min:    harjoitus?.kesto_min    ?? '',
    toistot:      harjoitus?.toistot      ?? '',
    frekvenssi:   harjoitus?.frekvenssi   ?? '',
    varoitukset:  harjoitus?.varoitukset  ?? '',
    kuva_url:     harjoitus?.kuva_url     ?? '',
    video_url:    harjoitus?.video_url    ?? '',
  })
  const [tallentaa, setTallentaa] = useState(false)
  const [virhe, setVirhe] = useState(null)

  function muuta(kentta, arvo) { setTila((p) => ({ ...p, [kentta]: arvo })) }
  function toggleAlue(alue) {
    setTila((p) => ({
      ...p,
      kohdealueet: p.kohdealueet.includes(alue)
        ? p.kohdealueet.filter((a) => a !== alue)
        : [...p.kohdealueet, alue],
    }))
  }

  async function tallenna() {
    if (!tila.nimi.trim()) { setVirhe('Nimi puuttuu'); return }
    setTallentaa(true)
    setVirhe(null)
    const tiedot = {
      ...tila,
      kesto_min: tila.kesto_min === '' ? null : Number(tila.kesto_min),
    }
    const tulos = harjoitus?.id
      ? await paivitaItsehoitoHarjoitus(harjoitus.id, tiedot)
      : await luoItsehoitoHarjoitus(tiedot)
    setTallentaa(false)
    if (tulos.virhe) { setVirhe(tulos.virhe); return }
    onTallennettu()
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col gap-4 mt-2">
      <div className="flex flex-col gap-1">
        <label className={labelLuokka}>Nimi *</label>
        <input
          type="text"
          value={tila.nimi}
          onChange={(e) => muuta('nimi', e.target.value.slice(0, 80))}
          maxLength={80}
          placeholder="Esim. Niskan venytysliikkeet"
          className={inputLuokka}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelLuokka}>Lyhyt kuvaus</label>
        <input
          type="text"
          value={tila.lyhyt_kuvaus}
          onChange={(e) => muuta('lyhyt_kuvaus', e.target.value)}
          placeholder="Yksi rivi joka näkyy listalla"
          className={inputLuokka}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelLuokka}>Pitkä ohje</label>
        <textarea
          value={tila.pitka_ohje}
          onChange={(e) => muuta('pitka_ohje', e.target.value)}
          placeholder="Vaihe vaiheelta, miten harjoitus tehdään…"
          rows={5}
          className={`${inputLuokka} resize-y`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelLuokka}>Kohdealueet</label>
        <div className="flex flex-wrap gap-1.5">
          {ALUEET.map((alue) => {
            const valittu = tila.kohdealueet.includes(alue)
            return (
              <button
                key={alue}
                type="button"
                onClick={() => toggleAlue(alue)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  valittu
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'
                }`}
              >
                {alue}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelLuokka}>Kesto (min)</label>
          <input
            type="number"
            min="0"
            value={tila.kesto_min}
            onChange={(e) => muuta('kesto_min', e.target.value)}
            placeholder="esim. 5"
            className={inputLuokka}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelLuokka}>Toistot</label>
          <input
            type="text"
            value={tila.toistot}
            onChange={(e) => muuta('toistot', e.target.value)}
            placeholder="esim. 3x10"
            className={inputLuokka}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelLuokka}>Frekvenssi</label>
          <input
            type="text"
            value={tila.frekvenssi}
            onChange={(e) => muuta('frekvenssi', e.target.value)}
            placeholder="esim. 3x päivässä"
            className={inputLuokka}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelLuokka}>Varoitukset</label>
        <textarea
          value={tila.varoitukset}
          onChange={(e) => muuta('varoitukset', e.target.value)}
          placeholder="Mitä asiakkaan tulee välttää? Milloin lopettaa?"
          rows={2}
          className={`${inputLuokka} resize-y`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelLuokka}>Kuva-URL</label>
          <input
            type="url"
            value={tila.kuva_url}
            onChange={(e) => muuta('kuva_url', e.target.value)}
            placeholder="https://…"
            className={inputLuokka}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelLuokka}>Video-URL</label>
          <input
            type="url"
            value={tila.video_url}
            onChange={(e) => muuta('video_url', e.target.value)}
            placeholder="https://…"
            className={inputLuokka}
          />
        </div>
      </div>

      {virhe && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {virhe}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onPeru}
          disabled={tallentaa}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Peruuta
        </button>
        <button
          type="button"
          onClick={tallenna}
          disabled={tallentaa || !tila.nimi.trim()}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          {tallentaa ? 'Tallennetaan…' : (harjoitus?.id ? 'Tallenna' : 'Lisää harjoitus')}
        </button>
      </div>
    </div>
  )
}

function HarjoitusKortti({ harjoitus, avoin, onAvaa, onSulje, onTallennettu, onArkistoi, onPalauta, arkistoTila }) {
  return (
    <div className={`bg-white rounded-xl border ${avoin ? 'border-brand-300' : 'border-gray-100'} shadow-sm p-4 flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => avoin ? onSulje() : onAvaa(harjoitus.id)}
            className="text-left w-full"
          >
            <p className="font-semibold text-gray-800 text-sm">{harjoitus.nimi}</p>
            {harjoitus.lyhyt_kuvaus && (
              <p className="text-xs text-gray-500 mt-1">{harjoitus.lyhyt_kuvaus}</p>
            )}
            {harjoitus.kohdealueet?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {harjoitus.kohdealueet.map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {[
                harjoitus.kesto_min ? `${harjoitus.kesto_min} min` : null,
                harjoitus.toistot,
                harjoitus.frekvenssi,
              ].filter(Boolean).join(' · ') || ''}
            </p>
          </button>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {arkistoTila ? (
            <button
              type="button"
              onClick={() => onPalauta(harjoitus)}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-500 text-gray-600 hover:text-brand-700 rounded-lg"
            >
              ↺ Palauta
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onArkistoi(harjoitus)}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-500 rounded-lg"
            >
              🗄 Arkistoi
            </button>
          )}
        </div>
      </div>

      {avoin && !arkistoTila && (
        <HarjoitusEditori
          harjoitus={harjoitus}
          onTallennettu={() => { onSulje(); onTallennettu() }}
          onPeru={onSulje}
        />
      )}
    </div>
  )
}

export default function ItsehoitoKirjasto() {
  const [arkistoTila, setArkistoTila] = useState(false)
  const [harjoitukset, setHarjoitukset] = useState([])
  const [haku, setHaku] = useState('')
  const [valitutAlueet, setValitutAlueet] = useState([])
  const [avoinId, setAvoinId] = useState(null)
  const [uusiAuki, setUusiAuki] = useState(false)
  const [lataa, setLataa] = useState(true)

  async function lataa_data() {
    setLataa(true)
    const data = await haeItsehoitoKirjasto({ arkistoitu: arkistoTila })
    setHarjoitukset(data)
    setLataa(false)
  }

  useEffect(() => { lataa_data() }, [arkistoTila])

  async function arkistoi(harjoitus) {
    const tulos = await paivitaItsehoitoHarjoitus(harjoitus.id, { arkistoitu: true })
    if (tulos.virhe) { alert('Arkistointi epäonnistui: ' + tulos.virhe); return }
    await lataa_data()
  }

  async function palauta(harjoitus) {
    const tulos = await paivitaItsehoitoHarjoitus(harjoitus.id, { arkistoitu: false })
    if (tulos.virhe) { alert('Palautus epäonnistui: ' + tulos.virhe); return }
    await lataa_data()
  }

  function toggleAlue(alue) {
    setValitutAlueet((p) => p.includes(alue) ? p.filter((a) => a !== alue) : [...p, alue])
  }

  const suodatetut = useMemo(() => {
    const h = haku.trim().toLowerCase()
    return harjoitukset.filter((x) => {
      if (h && !(
        x.nimi?.toLowerCase().includes(h) ||
        x.lyhyt_kuvaus?.toLowerCase().includes(h) ||
        x.pitka_ohje?.toLowerCase().includes(h)
      )) return false
      if (valitutAlueet.length > 0) {
        const sisaltaa = valitutAlueet.some((a) => (x.kohdealueet ?? []).includes(a))
        if (!sisaltaa) return false
      }
      return true
    })
  }, [harjoitukset, haku, valitutAlueet])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 leading-relaxed">
        Yleinen harjoituskirjasto. Pala B6:ssa hoitaja valitsee tästä asiakkaan
        omaan itsehoito-ohjelmaan.
      </p>

      {/* Välilehdet */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => { setArkistoTila(false); setAvoinId(null) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            !arkistoTila
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Aktiiviset
        </button>
        <button
          type="button"
          onClick={() => { setArkistoTila(true); setAvoinId(null); setUusiAuki(false) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            arkistoTila
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🗄 Arkisto
        </button>
      </div>

      {!arkistoTila && (
        <>
          {/* Hakukenttä + lisäys-nappi */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={haku}
              onChange={(e) => setHaku(e.target.value)}
              placeholder="Hae nimellä, kuvauksella tai ohjeella…"
              className={`flex-1 min-w-[200px] ${inputLuokka}`}
            />
            <button
              type="button"
              onClick={() => { setUusiAuki(true); setAvoinId(null) }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm whitespace-nowrap"
            >
              + Uusi harjoitus
            </button>
          </div>

          {/* Aluepillerit */}
          <div className="flex flex-wrap gap-1.5">
            {ALUEET.map((alue) => {
              const valittu = valitutAlueet.includes(alue)
              return (
                <button
                  key={alue}
                  type="button"
                  onClick={() => toggleAlue(alue)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    valittu
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500'
                  }`}
                >
                  {alue}
                </button>
              )
            })}
            {valitutAlueet.length > 0 && (
              <button
                type="button"
                onClick={() => setValitutAlueet([])}
                className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-600"
              >
                Tyhjennä suodattimet
              </button>
            )}
          </div>

          {/* Uuden harjoituksen editori */}
          {uusiAuki && (
            <HarjoitusEditori
              harjoitus={null}
              onTallennettu={() => { setUusiAuki(false); lataa_data() }}
              onPeru={() => setUusiAuki(false)}
            />
          )}
        </>
      )}

      {lataa && <div className="text-sm text-gray-400 py-4 text-center">Ladataan…</div>}

      {!lataa && suodatetut.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center text-sm text-amber-800">
          {arkistoTila
            ? 'Arkistossa ei ole harjoituksia.'
            : (harjoitukset.length === 0
                ? 'Et ole vielä luonut harjoituksia. Klikkaa "+ Uusi harjoitus" aloittaaksesi.'
                : 'Ei hakutuloksia tällä suodattimella.')}
        </div>
      )}

      {!lataa && suodatetut.map((h) => (
        <HarjoitusKortti
          key={h.id}
          harjoitus={h}
          avoin={avoinId === h.id}
          onAvaa={setAvoinId}
          onSulje={() => setAvoinId(null)}
          onTallennettu={lataa_data}
          onArkistoi={arkistoi}
          onPalauta={palauta}
          arkistoTila={arkistoTila}
        />
      ))}
    </div>
  )
}
