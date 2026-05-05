// Lomakepohjan editorinäkymä — täyssivu, korvaa LomakeKirjaston kun pohja avataan muokattavaksi.
// Pala 1: pohjan metadata + osioiden lisäys/poisto/järjestys/otsikko + versionti.
// Pala 2: kenttien lisäys/poisto/järjestys osion sisällä + pakollisuusrasti.

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../services/supabase'
import { haeKenttakirjasto, haePalvelutPohjalle, normalisoiPohjaRakenne } from '../../lib/db'
import LisaaKenttaModaali from './LisaaKenttaModaali'
import LomakeRenderoija from '../lomake/runtime/LomakeRenderoija'

const luoTunniste = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `osio-${crypto.randomUUID().slice(0, 8)}`
  }
  return `osio-${Math.random().toString(36).slice(2, 10)}`
}

const KENTTATYYPPI_NIMET = {
  tekstirivi:    'Tekstirivi',
  tekstikentta:  'Tekstikenttä',
  sahkoposti:    'Sähköposti',
  puhelin:       'Puhelin',
  paivamaara:    'Päivämäärä',
  numero:        'Numero',
  checkbox:      'Rasti',
  liukusaadin:   'Liukusäädin',
  checkbox_lista: 'Lista',
  kehonkartta:   'Kehonkartta',
  allekirjoitus: 'Allekirjoitus',
  infoteksti:    'Infoteksti',
  kuvantaminen:  'Kuvantaminen',
  linjausmittari: 'Linjausmittari',
}

function osioidenJsonStringi(osiot) {
  return JSON.stringify(osiot.map(o => ({
    id: o.id,
    otsikko: o.otsikko,
    jarjestys: o.jarjestys,
    rooli: o.rooli,                  // AB-T2b: rooli-muutos lasketaan onMuutoksia():iin
    kenttat: o.kenttat ?? [],
    ryhmittelyt: o.ryhmittelyt ?? [],
  })))
}

export default function LomakepohjaEditori({ pohja, rakenne, onTallennettu, onPeruuta }) {
  // Normalisoi rakenne ennen kuin osioista rakennetaan editorin alkutila —
  // takaa että jokaisella osiolla on rooli (default 'asiakas'). Saamme rakenteen
  // joko haeLomakepohja:n (jo normalisoitu) tai LomakeKirjasto:n (raakaa) kautta.
  const normalisoitu = normalisoiPohjaRakenne(rakenne)
  const alkuosiot = (normalisoitu?.osiot ?? []).map((o, i) => ({
    ...o,
    jarjestys: o.jarjestys ?? (i + 1),
    kenttat: o.kenttat ?? [],
  }))

  const [nimi,        setNimi]        = useState(pohja.nimi ?? '')
  const [kuvaus,      setKuvaus]      = useState(pohja.kuvaus ?? '')
  const [nayttotyyli, setNayttotyyli] = useState(rakenne?.nayttotyyli ?? 'c')
  const [osiot,       setOsiot]       = useState(alkuosiot)
  const [tallentaa,   setTallentaa]   = useState(false)
  const [virhe,       setVirhe]       = useState(null)
  const [tallennettu, setTallennettu] = useState(false)
  const palauteRef = useRef(null)

  // Kenttäkirjasto kentän lisäystä varten
  const [kenttakirjasto, setKenttakirjasto] = useState([])
  const [lisayksenKohde, setLisayksenKohde] = useState(null) // null tai osio.id
  const [esikatselu,     setEsikatselu]     = useState({ auki: false, vastaukset: {} })

  // Palvelut jotka käyttävät tätä pohjaa (1:N — read-only listaus)
  const [pohjanPalvelut, setPohjanPalvelut] = useState([])

  useEffect(() => {
    let peruttu = false
    haeKenttakirjasto().then((kentat) => {
      if (!peruttu) setKenttakirjasto(kentat)
    })
    if (pohja?.id) {
      haePalvelutPohjalle(pohja.id).then((palvelut) => {
        if (!peruttu) setPohjanPalvelut(palvelut)
      })
    }
    return () => { peruttu = true }
  }, [pohja?.id])

  // Indeksi: tunniste → kenttäkirjaston rivi (otsikon ja tyypin näyttöä varten)
  const kenttaIndex = useMemo(() => {
    const map = new Map()
    for (const k of kenttakirjasto) map.set(k.tunniste, k)
    return map
  }, [kenttakirjasto])

  // Esikatseluun: muunna kenttäkirjasto useLomakepohja-yhteensopivaan muotoon
  const kentatEsikatselulle = useMemo(() => {
    const map = {}
    for (const k of kenttakirjasto) {
      map[k.tunniste] = {
        id:         k.id,
        tunniste:   k.tunniste,
        tyyppi:     k.tyyppi,
        validointi: k.validointi ?? {},
        oletukset:  k.oletukset ?? {},
        kaannokset: {
          fi: {
            otsikko:     k.otsikko ?? k.tunniste,
            apurivi:     k.apurivi ?? '',
            placeholder: k.placeholder ?? '',
            sisalto:     k.sisalto ?? '',
          },
        },
      }
    }
    return map
  }, [kenttakirjasto])

  const esikatseluRakenne = useMemo(() => ({
    formaatti_versio: rakenne?.formaatti_versio ?? 1,
    nayttotyyli,
    osiot: osiot.map((o, i) => ({ ...o, jarjestys: i + 1 })),
  }), [rakenne, nayttotyyli, osiot])

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

  // ─── Osio-funktiot ─────────────────────────────────────────────────────────

  function lisaaOsio() {
    setOsiot([
      ...osiot,
      {
        id: luoTunniste(),
        jarjestys: osiot.length + 1,
        otsikko: { fi: '', en: '' },
        rooli: 'asiakas',                // AB-T2b: default asiakkaan osio
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

  function paivitaOsionRooli(id, rooli) {
    if (rooli !== 'asiakas' && rooli !== 'hoitaja') return
    setOsiot(osiot.map((o) => o.id === id ? { ...o, rooli } : o))
  }

  // ─── Kenttä-funktiot ───────────────────────────────────────────────────────

  function lisaaKenttaOsioon(osioId, tunniste) {
    // Oletuspakollisuus: jos kenttäkirjastossa on validointi.pakollinen=true, käytä sitä; muuten false
    const kentta = kenttaIndex.get(tunniste)
    const pakollinenOletus = kentta?.validointi?.pakollinen === true

    setOsiot(osiot.map((o) => {
      if (o.id !== osioId) return o
      const seuraavaJarjestys = (o.kenttat?.length ?? 0) + 1
      return {
        ...o,
        kenttat: [
          ...(o.kenttat ?? []),
          {
            kentta_id_tunniste: tunniste,
            jarjestys:          seuraavaJarjestys,
            pakollinen:         pakollinenOletus,
            ryhma:              null,
          },
        ],
      }
    }))
  }

  // Kun käyttäjä luo uuden kentän kenttäkirjastoon LuoUusiKenttaModaalin kautta,
  // päivitä kenttäkirjasto-tila + lisää kenttä heti osioon.
  async function uusiKenttaLuotu(osioId, tunniste) {
    const uudetKentat = await haeKenttakirjasto()
    setKenttakirjasto(uudetKentat)
    // Lisää kenttä osioon — kenttaIndex on memo joka päivittyy seuraavalla
    // renderillä, joten haetaan tunniste manuaalisesti tuoreesta listasta.
    const kentta = uudetKentat.find((k) => k.tunniste === tunniste)
    const pakollinenOletus = kentta?.validointi?.pakollinen === true
    setOsiot((prev) => prev.map((o) => {
      if (o.id !== osioId) return o
      return {
        ...o,
        kenttat: [
          ...(o.kenttat ?? []),
          {
            kentta_id_tunniste: tunniste,
            jarjestys:          (o.kenttat?.length ?? 0) + 1,
            pakollinen:         pakollinenOletus,
            ryhma:              null,
          },
        ],
      }
    }))
  }

  function poistaKenttaOsiosta(osioId, tunniste) {
    setOsiot(osiot.map((o) => {
      if (o.id !== osioId) return o
      const suodatettu = (o.kenttat ?? []).filter((kf) => kf.kentta_id_tunniste !== tunniste)
      return { ...o, kenttat: suodatettu.map((kf, i) => ({ ...kf, jarjestys: i + 1 })) }
    }))
  }

  function siirraKentta(osioId, tunniste, suunta) {
    setOsiot(osiot.map((o) => {
      if (o.id !== osioId) return o
      const kentat = o.kenttat ?? []
      const idx = kentat.findIndex((kf) => kf.kentta_id_tunniste === tunniste)
      const uusiIdx = idx + suunta
      if (idx < 0 || uusiIdx < 0 || uusiIdx >= kentat.length) return o
      const kopio = [...kentat]
      ;[kopio[idx], kopio[uusiIdx]] = [kopio[uusiIdx], kopio[idx]]
      return { ...o, kenttat: kopio.map((kf, i) => ({ ...kf, jarjestys: i + 1 })) }
    }))
  }

  function paivitaPakollinen(osioId, tunniste, pakollinen) {
    setOsiot(osiot.map((o) => {
      if (o.id !== osioId) return o
      return {
        ...o,
        kenttat: (o.kenttat ?? []).map((kf) =>
          kf.kentta_id_tunniste === tunniste ? { ...kf, pakollinen } : kf
        ),
      }
    }))
  }

  // ─── Validointi & tallennus ────────────────────────────────────────────────

  function validoi() {
    if (!nimi.trim()) return 'Pohjalla pitää olla nimi.'
    if (osiot.length === 0) return 'Pohjassa pitää olla vähintään yksi osio.'
    for (let i = 0; i < osiot.length; i++) {
      const o = osiot[i]
      const otsikko = typeof o.otsikko === 'object' ? o.otsikko?.fi : o.otsikko
      if (!otsikko?.trim()) return `Osion ${i + 1} otsikko puuttuu.`
      if ((o.kenttat ?? []).length === 0) return `Osio "${otsikko}" ei sisällä yhtään kenttää.`
    }
    return null
  }

  async function tallenna() {
    const validointivirhe = validoi()
    if (validointivirhe) {
      setVirhe(validointivirhe)
      setTallennettu(false)
      // Scrollaa virheilmoitus näkyviin jotta käyttäjä huomaa sen
      setTimeout(() => palauteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }

    setTallentaa(true)
    setVirhe(null)
    setTallennettu(false)

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
        if (error) {
          console.error('[LomakepohjaEditori] Pohjan metadatan päivitys epäonnistui:', error)
          throw error
        }
      }

      // 2. Hae uusin versio-numero
      const { data: viimeisin, error: hakuVirhe } = await supabase
        .from('lomakepohja_versiot')
        .select('versio')
        .eq('pohja_id', pohja.id)
        .order('versio', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (hakuVirhe) {
        console.error('[LomakepohjaEditori] Versio-numeron haku epäonnistui:', hakuVirhe)
        throw hakuVirhe
      }
      const seuraavaVersio = (viimeisin?.versio ?? 0) + 1

      // 3. Luo uusi versio
      const uusiRakenne = {
        formaatti_versio: rakenne?.formaatti_versio ?? 1,
        nayttotyyli,
        osiot: osiot.map((o, i) => ({ ...o, jarjestys: i + 1 })),
      }
      const { error: insertVirhe } = await supabase
        .from('lomakepohja_versiot')
        .insert({
          pohja_id:   pohja.id,
          versio:     seuraavaVersio,
          rakenne:    uusiRakenne,
          aktiivinen: true,
        })
      if (insertVirhe) {
        console.error('[LomakepohjaEditori] Version tallennus epäonnistui:', insertVirhe)
        throw insertVirhe
      }

      // 4. Palvelu↔pohja-suhde (1:N) hallitaan Asetukset → Palvelut -näkymässä,
      //    ei enää editorissa. Pohja päivittyy tällöin automaattisesti niissä
      //    palveluissa joiden lomakepohja_id viittaa tähän pohjaan.

      setTallennettu(true)
      // Scrollaa onnistumisilmoitus näkyviin + viive jotta käyttäjä näkee sen ennen palaamista
      setTimeout(() => palauteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      setTimeout(onTallennettu, 1200)
    } catch (e) {
      const viesti = e?.message ?? e?.error_description ?? 'Tallennus epäonnistui (tarkemmat tiedot konsolissa)'
      console.error('[LomakepohjaEditori] Tallennusvirhe:', e)
      setVirhe(viesti)
      setTimeout(() => palauteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const lisayksenOsio = osiot.find((o) => o.id === lisayksenKohde)
  const lisayksenKaytetytTunnisteet = useMemo(() => {
    const set = new Set()
    if (lisayksenOsio) {
      for (const kf of lisayksenOsio.kenttat ?? []) set.add(kf.kentta_id_tunniste)
    }
    return set
  }, [lisayksenOsio])

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
          <div className="flex items-center gap-2 flex-shrink-0 pt-5 flex-wrap">
            <button
              type="button"
              onClick={peruuta}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Peruuta
            </button>
            <button
              type="button"
              onClick={() => setEsikatselu({ auki: true, vastaukset: {} })}
              disabled={osiot.length === 0}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:border-brand-500 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={osiot.length === 0 ? 'Lisää ensin osio' : 'Esikatsele tallentamaton rakenne'}
            >
              👁 Esikatsele
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

        {/* Tätä pohjaa käyttävät palvelut (read-only — vaihto tehdään Asetukset → Palvelut) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Tätä pohjaa käyttävät palvelut
          </label>
          <div className="flex items-center gap-2 flex-wrap min-h-[40px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            {pohjanPalvelut.length === 0 ? (
              <span className="text-sm text-gray-400 italic">Ei yhtään palvelua käyttää tätä pohjaa</span>
            ) : (
              pohjanPalvelut.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
                >
                  {!p.aktiivinen && <span title="Palvelu ei aktiivinen">💤</span>}
                  {p.nimi}
                </span>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500">
            Liitäntä tehdään Asetukset → Palvelut. Yksi palvelu käyttää aina yhtä pohjaa.
          </p>
        </div>

        {virhe && (
          <div ref={palauteRef} className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm flex items-start gap-3">
            <span className="text-2xl leading-none flex-shrink-0">⚠</span>
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Tallennus ei onnistunut</p>
              <p className="text-red-700">{virhe}</p>
            </div>
          </div>
        )}
        {tallennettu && !virhe && (
          <div ref={palauteRef} className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm flex items-start gap-3">
            <span className="text-2xl leading-none flex-shrink-0">✓</span>
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Versio tallennettu</p>
              <p className="text-emerald-700">Palataan kirjastoon hetken kuluttua…</p>
            </div>
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
          const kentat = osio.kenttat ?? []
          const onAsiakas = osio.rooli === 'asiakas'
          // Kevyt vasen reuna roolin mukaan: sininen = asiakkaan osio, vihreä = hoitajan
          const reunaLuokka = onAsiakas
            ? 'border-l-4 border-l-blue-300'
            : 'border-l-4 border-l-emerald-300'
          return (
            <div
              key={osio.id}
              className={`bg-white rounded-xl border border-gray-100 ${reunaLuokka} shadow-sm p-4 flex flex-col gap-3`}
            >

              {/* Rooli — kuka osion täyttää (AB-T2b) */}
              <div
                className="flex items-center gap-4 flex-wrap text-xs"
                title="Asiakkaan kirjaukset (esim. perustiedot, oireet) vs hoitajan kirjaukset (havainnot, mittaukset). Vaikuttaa lomakkeen visuaaliseen erotteluun ja jatkossa siihen kuka osiota voi muokata."
              >
                <span className="font-medium text-gray-500 uppercase tracking-wide">Rooli</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`rooli-${osio.id}`}
                    checked={onAsiakas}
                    onChange={() => paivitaOsionRooli(osio.id, 'asiakas')}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-gray-700 select-none">Asiakkaan osio</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`rooli-${osio.id}`}
                    checked={!onAsiakas}
                    onChange={() => paivitaOsionRooli(osio.id, 'hoitaja')}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-gray-700 select-none">Hoitajan osio</span>
                </label>
              </div>

              {/* Osion otsikko + nuolet + poisto */}
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

              {/* Kentät */}
              <div className="flex flex-col gap-2 pl-8">
                {kentat.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Ei kenttiä. Lisää ensimmäinen kenttä alta.</p>
                )}

                {kentat.map((kf, kIdx) => {
                  const kentta = kenttaIndex.get(kf.kentta_id_tunniste)
                  const otsikko = kentta?.otsikko ?? kf.kentta_id_tunniste
                  const tyyppiNimi = KENTTATYYPPI_NIMET[kentta?.tyyppi] ?? kentta?.tyyppi ?? '—'
                  const tunniste = kf.kentta_id_tunniste
                  return (
                    <div key={tunniste} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate flex items-center gap-1.5">
                          <span className="truncate">{otsikko}</span>
                          {kentta?.pysyva && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium flex-shrink-0"
                              title="Pysyvä — kentän arvo säilyy seuraavalle käynnille (muokataan Kenttäkirjastosta)"
                            >
                              🔒 Pysyvä
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tyyppiNimi} · <code className="text-gray-400">{tunniste}</code>
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={!!kf.pakollinen}
                          onChange={(e) => paivitaPakollinen(osio.id, tunniste, e.target.checked)}
                          className="w-4 h-4 accent-brand-600 cursor-pointer"
                        />
                        <span>Pakollinen</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => siirraKentta(osio.id, tunniste, -1)}
                        disabled={kIdx === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Siirrä ylös"
                        title="Siirrä ylös"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => siirraKentta(osio.id, tunniste, 1)}
                        disabled={kIdx === kentat.length - 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Siirrä alas"
                        title="Siirrä alas"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => poistaKenttaOsiosta(osio.id, tunniste)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Poista kenttä osiosta"
                        title="Poista kenttä osiosta"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setLisayksenKohde(osio.id)}
                  className="bg-white border border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50 text-gray-600 hover:text-brand-700 rounded-lg py-2 text-xs font-medium transition-colors"
                >
                  + Lisää kenttä
                </button>
              </div>
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

      {/* Lisää-kenttä-modaali */}
      {lisayksenKohde && (
        <LisaaKenttaModaali
          kenttakirjasto={kenttakirjasto}
          kaytetytTunnisteet={lisayksenKaytetytTunnisteet}
          onValitse={(tunniste) => lisaaKenttaOsioon(lisayksenKohde, tunniste)}
          onUusiKenttaLuotu={(tunniste) => uusiKenttaLuotu(lisayksenKohde, tunniste)}
          onSulje={() => setLisayksenKohde(null)}
        />
      )}

      {/* Esikatselu-modaali */}
      {esikatselu.auki && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-gray-800">Esikatselu</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tallentamaton rakenne · vastaukset eivät tallennu mihinkään
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEsikatselu({ auki: false, vastaukset: {} })}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sulje esikatselu
              </button>
            </div>
            <div className="px-5 py-4 bg-gray-50">
              <LomakeRenderoija
                valmiitTiedot={{ rakenne: esikatseluRakenne, kentat: kentatEsikatselulle }}
                vastaukset={esikatselu.vastaukset}
                onMuutos={(uudet) => setEsikatselu((p) => ({
                  ...p,
                  vastaukset: typeof uudet === 'function' ? uudet(p.vastaukset) : uudet,
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
