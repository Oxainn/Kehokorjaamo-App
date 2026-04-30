// Lomakepohjan editorinäkymä — täyssivu, korvaa LomakeKirjaston kun pohja avataan muokattavaksi.
// Pala 1: pohjan metadata + osioiden lisäys/poisto/järjestys/otsikko + versionti.
// Kentät tulevat Palassa 2.

import { useState } from 'react'
import { supabase } from '../../services/supabase'

const luoTunniste = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `osio-${crypto.randomUUID().slice(0, 8)}`
  }
  return `osio-${Math.random().toString(36).slice(2, 10)}`
}

function osioidenJsonStringi(osiot) {
  return JSON.stringify(osiot.map(o => ({
    id: o.id,
    otsikko: o.otsikko,
    jarjestys: o.jarjestys,
    kenttat: o.kenttat ?? [],
    ryhmittelyt: o.ryhmittelyt ?? [],
  })))
}

export default function LomakepohjaEditori({ pohja, rakenne, onTallennettu, onPeruuta }) {
  const alkuosiot = (rakenne?.osiot ?? []).map((o, i) => ({
    ...o,
    jarjestys: o.jarjestys ?? (i + 1),
  }))

  const [nimi,        setNimi]        = useState(pohja.nimi ?? '')
  const [kuvaus,      setKuvaus]      = useState(pohja.kuvaus ?? '')
  const [nayttotyyli, setNayttotyyli] = useState(rakenne?.nayttotyyli ?? 'c')
  const [osiot,       setOsiot]       = useState(alkuosiot)
  const [tallentaa,   setTallentaa]   = useState(false)
  const [virhe,       setVirhe]       = useState(null)

  const [alkuTila] = useState({
    nimi:        pohja.nimi ?? '',
    kuvaus:      pohja.kuvaus ?? '',
    nayttotyyli: rakenne?.nayttotyyli ?? 'c',
    osiotJson:   osioidenJsonStringi(alkuosiot),
  })

  function onMuutoksia() {
    return (
      nimi !== alkuTila.nimi ||
      kuvaus !== alkuTila.kuvaus ||
      nayttotyyli !== alkuTila.nayttotyyli ||
      osioidenJsonStringi(osiot) !== alkuTila.osiotJson
    )
  }

  function lisaaOsio() {
    setOsiot([
      ...osiot,
      {
        id: luoTunniste(),
        jarjestys: osiot.length + 1,
        otsikko: { fi: '', en: '' },
        kenttat: [],
        ryhmittelyt: [],
      },
    ])
  }

  function poistaOsio(id) {
    if (!window.confirm('Poistetaanko tämä osio? Sen kentät katoavat tästä pohjasta.')) return
    const suodatettu = osiot.filter((o) => o.id !== id)
    setOsiot(suodatettu.map((o, i) => ({ ...o, jarjestys: i + 1 })))
  }

  function siirraOsio(id, suunta) {
    const idx = osiot.findIndex((o) => o.id === id)
    const uusiIdx = idx + suunta
    if (uusiIdx < 0 || uusiIdx >= osiot.length) return
    const kopio = [...osiot]
    ;[kopio[idx], kopio[uusiIdx]] = [kopio[uusiIdx], kopio[idx]]
    setOsiot(kopio.map((o, i) => ({ ...o, jarjestys: i + 1 })))
  }

  function paivitaOsionOtsikko(id, fiTeksti) {
    setOsiot(osiot.map((o) => {
      if (o.id !== id) return o
      const nykyinen = typeof o.otsikko === 'object' ? o.otsikko : { fi: o.otsikko ?? '', en: '' }
      return { ...o, otsikko: { ...nykyinen, fi: fiTeksti } }
    }))
  }

  function validoi() {
    if (!nimi.trim()) return 'Pohjalla pitää olla nimi.'
    if (osiot.length === 0) return 'Pohjassa pitää olla vähintään yksi osio.'
    for (let i = 0; i < osiot.length; i++) {
      const o = osiot[i]
      const otsikko = typeof o.otsikko === 'object' ? o.otsikko?.fi : o.otsikko
      if (!otsikko?.trim()) return `Osion ${i + 1} otsikko puuttuu.`
    }
    return null
  }

  async function tallenna() {
    const validointivirhe = validoi()
    if (validointivirhe) { setVirhe(validointivirhe); return }

    setTallentaa(true)
    setVirhe(null)

    try {
      // 1. Päivitä pohjan metadata jos muuttunut
      if (nimi !== alkuTila.nimi || kuvaus !== alkuTila.kuvaus) {
        const { error } = await supabase
          .from('lomakepohjat')
          .update({
            nimi: nimi.trim(),
            kuvaus: kuvaus.trim() || null,
            paivitetty: new Date().toISOString(),
          })
          .eq('id', pohja.id)
        if (error) throw error
      }

      // 2. Hae uusin versio-numero
      const { data: viimeisin, error: hakuVirhe } = await supabase
        .from('lomakepohja_versiot')
        .select('versio')
        .eq('pohja_id', pohja.id)
        .order('versio', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (hakuVirhe) throw hakuVirhe
      const seuraavaVersio = (viimeisin?.versio ?? 0) + 1

      // 3. Luo uusi versio
      const { error: insertVirhe } = await supabase
        .from('lomakepohja_versiot')
        .insert({
          pohja_id: pohja.id,
          versio:   seuraavaVersio,
          rakenne: {
            formaatti_versio: rakenne?.formaatti_versio ?? 1,
            nayttotyyli,
            osiot: osiot.map((o, i) => ({ ...o, jarjestys: i + 1 })),
          },
          aktiivinen: true,
        })
      if (insertVirhe) throw insertVirhe

      onTallennettu()
    } catch (e) {
      setVirhe(e.message ?? 'Tallennus epäonnistui')
    } finally {
      setTallentaa(false)
    }
  }

  function peruuta() {
    if (onMuutoksia() && !window.confirm('Tallentamattomia muutoksia katoaa. Haluatko varmasti peruuttaa?')) {
      return
    }
    onPeruuta()
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Yläpalkki */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pohjan nimi *
            </label>
            <input
              type="text"
              value={nimi}
              onChange={(e) => setNimi(e.target.value)}
              placeholder="Esim. Hieronta — Laajennettu"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pt-5">
            <button
              type="button"
              onClick={peruuta}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Peruuta
            </button>
            <button
              type="button"
              onClick={tallenna}
              disabled={tallentaa}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              {tallentaa ? 'Tallennetaan…' : 'Tallenna versiona'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Kuvaus
          </label>
          <input
            type="text"
            value={kuvaus}
            onChange={(e) => setKuvaus(e.target.value)}
            placeholder="Lyhyt kuvaus (valinnainen)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Näyttötyyli
          </label>
          <select
            value={nayttotyyli}
            onChange={(e) => setNayttotyyli(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="c">Osio kerrallaan (C-tyyli)</option>
            <option value="yksi_sivu">Kaikki osiot allekkain</option>
            <option value="accordion">Accordion-tyyli</option>
          </select>
        </div>

        {virhe && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {virhe}
          </div>
        )}
      </div>

      {/* Osiolista */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Osiot ({osiot.length})
          </h3>
        </div>

        {osiot.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500">Ei osioita. Lisää ensimmäinen osio alta.</p>
          </div>
        )}

        {osiot.map((osio, i) => {
          const otsikkoFi = typeof osio.otsikko === 'object' ? (osio.otsikko?.fi ?? '') : (osio.otsikko ?? '')
          const kenttienMaara = (osio.kenttat ?? []).length
          return (
            <div key={osio.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400 w-6 text-right">{i + 1}.</span>
                <input
                  type="text"
                  value={otsikkoFi}
                  onChange={(e) => paivitaOsionOtsikko(osio.id, e.target.value)}
                  placeholder="Osion otsikko"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => siirraOsio(osio.id, -1)}
                  disabled={i === 0}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Siirrä ylös"
                  title="Siirrä ylös"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => siirraOsio(osio.id, 1)}
                  disabled={i === osiot.length - 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Siirrä alas"
                  title="Siirrä alas"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => poistaOsio(osio.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                  aria-label="Poista osio"
                  title="Poista osio"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-400 pl-8">
                {kenttienMaara === 0 ? 'Ei kenttiä' : `${kenttienMaara} kenttää`} (kenttien hallinta tulee Pala 2:ssa)
              </p>
            </div>
          )
        })}

        <button
          type="button"
          onClick={lisaaOsio}
          className="bg-white border-2 border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50 text-gray-600 hover:text-brand-700 rounded-xl py-4 text-sm font-medium transition-colors"
        >
          + Lisää osio
        </button>
      </div>
    </div>
  )
}
