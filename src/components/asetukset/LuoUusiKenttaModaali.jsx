// Modaali uuden kentän luomiseksi kenttäkirjastoon.
// Tukee 14 kenttätyyppiä, tyyppikohtaiset asetukset (numero/liukusaadin/checkbox_lista/infoteksti/linjausmittari).

import { useState, useMemo, useEffect } from 'react'
import { luoUusiKentta } from '../../lib/db'
import { MITTARIT } from '../../data/linjausmittarit'

const KENTTATYYPIT = [
  { arvo: 'infoteksti',     nimi: 'Infoteksti (näkyy lomakkeessa, ei syötettä)' },
  { arvo: 'tekstirivi',     nimi: 'Tekstirivi (lyhyt teksti)' },
  { arvo: 'tekstikentta',   nimi: 'Tekstikenttä (pitkä teksti, monirivinen)' },
  { arvo: 'sahkoposti',     nimi: 'Sähköposti' },
  { arvo: 'puhelin',        nimi: 'Puhelinnumero' },
  { arvo: 'paivamaara',     nimi: 'Päivämäärä' },
  { arvo: 'numero',         nimi: 'Numero' },
  { arvo: 'checkbox',       nimi: 'Yksittäinen rasti' },
  { arvo: 'liukusaadin',    nimi: 'Liukusäädin (asteikko)' },
  { arvo: 'checkbox_lista', nimi: 'Lista (rastit, useita valittavissa)' },
  { arvo: 'kehonkartta',    nimi: 'Kehonkartta (piirros)' },
  { arvo: 'allekirjoitus',  nimi: 'Allekirjoitus' },
  { arvo: 'kuvantaminen',             nimi: 'Kuvantaminen (4 asentokuvaa + AI-analyysi)' },
  { arvo: 'linjausmittari',           nimi: 'Linjausmittari (hoitajan asentokulma)' },
  { arvo: 'bodymap_havainnot',        nimi: 'BodyMap-havainnot (hoitajan löydökset)' },
  { arvo: 'itsehoito_valinnat',       nimi: 'Itsehoito-valinnat (käyntikohtainen)' },
  { arvo: 'ai_loydosanalyysi',        nimi: 'AI-löydösanalyysi (Claude-tulkinta)' },
  { arvo: 'edellisen_kaynnin_muista', nimi: 'Edellisen käynnin Muista-nosto' },
]

const VARIKOODAUS_VAIHTOEHDOT = [
  { arvo: '',                            nimi: 'Ei värikoodausta' },
  { arvo: 'vihrea_keltainen_punainen',   nimi: 'Vihreä → keltainen → punainen' },
]

const CHECKBOX_LISTA_LAHTEET = [
  { arvo: 'sairaustyypit_taulu', nimi: 'Sairauslista (sairaus_tyypit -taulu)' },
]

function tunnisteOtsikosta(otsikko) {
  return (otsikko ?? '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

const inputLuokka = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelLuokka = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

export default function LuoUusiKenttaModaali({ onLuotu, onSulje }) {
  const [otsikko,        setOtsikko]        = useState('')
  const [tunniste,       setTunniste]       = useState('')
  const [tunnisteMuokattu, setTunnisteMuokattu] = useState(false)
  const [tyyppi,         setTyyppi]         = useState('tekstirivi')
  const [apurivi,        setApurivi]        = useState('')
  const [placeholder,    setPlaceholder]    = useState('')

  // Numero-kentän asetukset
  const [numeroMin,      setNumeroMin]      = useState('')
  const [numeroMax,      setNumeroMax]      = useState('')
  const [numeroYksikko,  setNumeroYksikko]  = useState('')

  // Liukusäätimen asetukset
  const [saadinMin,      setSaadinMin]      = useState('0')
  const [saadinMax,      setSaadinMax]      = useState('10')
  const [saadinAskel,    setSaadinAskel]    = useState('1')
  const [saadinOhjeMin,  setSaadinOhjeMin]  = useState('')
  const [saadinOhjeMax,  setSaadinOhjeMax]  = useState('')
  const [saadinVari,     setSaadinVari]     = useState('')

  // Checkbox-lista
  const [listaLahde,     setListaLahde]     = useState('sairaustyypit_taulu')

  // Linjausmittari (Pala 1) — viittaus MITTARIT-listan sarakkeeseen
  const [linjausmittariSarake, setLinjausmittariSarake] = useState(MITTARIT[0]?.sarake ?? '')

  // Infoteksti — sisältö (pidempi tekstilohko)
  const [infoSisalto,    setInfoSisalto]    = useState('')

  // Pysyvyys (AB-T1b): kentän arvo säilyy seuraavalle käynnille kun true.
  // Default false — pysyvyys on poikkeus, muuttuva on tavallinen tila.
  const [pysyva,         setPysyva]         = useState(false)

  const [tallentaa,      setTallentaa]      = useState(false)
  const [virhe,          setVirhe]          = useState(null)

  // Auto-genereöi tunniste otsikosta kunnes käyttäjä koskee tunnistettä manuaalisesti
  useEffect(() => {
    if (!tunnisteMuokattu) setTunniste(tunnisteOtsikosta(otsikko))
  }, [otsikko, tunnisteMuokattu])

  const validointi = useMemo(() => {
    if (tyyppi === 'numero') {
      const v = {}
      if (numeroMin !== '') v.min = Number(numeroMin)
      if (numeroMax !== '') v.max = Number(numeroMax)
      return v
    }
    if (tyyppi === 'liukusaadin') {
      const v = {}
      if (saadinMin !== '') v.min = Number(saadinMin)
      if (saadinMax !== '') v.max = Number(saadinMax)
      return v
    }
    if (tyyppi === 'checkbox_lista') {
      return { lahde: listaLahde }
    }
    if (tyyppi === 'allekirjoitus') {
      return { vaatii_piirron: true }
    }
    return {}
  }, [tyyppi, numeroMin, numeroMax, saadinMin, saadinMax, listaLahde])

  const oletukset = useMemo(() => {
    if (tyyppi === 'numero' && numeroYksikko.trim()) {
      return { yksikko: numeroYksikko.trim(), nayta_yksikko: true }
    }
    if (tyyppi === 'liukusaadin') {
      const o = {}
      if (saadinAskel !== '') o.askel = Number(saadinAskel)
      if (saadinVari) o.varikoodaus = saadinVari
      if (saadinOhjeMin.trim() || saadinOhjeMax.trim()) {
        o.ohjeet = {
          min: { fi: saadinOhjeMin.trim() },
          max: { fi: saadinOhjeMax.trim() },
        }
      }
      return o
    }
    if (tyyppi === 'linjausmittari') {
      // Viittaa MITTARIT-listan sarake-arvoon. Runtime (Linjausmittari.jsx) etsii
      // MITTARIT.find(m => m.sarake === mittari_sarake) ja saa min/max/normaali sieltä.
      return { mittari_sarake: linjausmittariSarake }
    }
    return {}
  }, [tyyppi, numeroYksikko, saadinAskel, saadinVari, saadinOhjeMin, saadinOhjeMax, linjausmittariSarake])

  async function tallenna() {
    // Infoteksti voi olla ilman otsikkoa kunhan sisältö on annettu
    if (tyyppi === 'infoteksti') {
      if (!otsikko.trim() && !infoSisalto.trim()) {
        setVirhe('Anna joko otsikko tai sisältö')
        return
      }
    } else if (!otsikko.trim()) {
      setVirhe('Otsikko puuttuu')
      return
    }

    if (!tunniste.trim()) { setVirhe('Tunniste puuttuu'); return }
    if (!/^[a-z][a-z0-9_]*$/.test(tunniste)) {
      setVirhe('Tunniste saa sisältää vain pieniä kirjaimia, numeroita ja alaviivoja, alkaa kirjaimella')
      return
    }

    setTallentaa(true)
    setVirhe(null)
    try {
      const tulos = await luoUusiKentta({
        tunniste,
        tyyppi,
        otsikko: otsikko.trim() || tunniste,
        apurivi,
        placeholder,
        sisalto: tyyppi === 'infoteksti' ? infoSisalto : '',
        validointi,
        oletukset,
        pysyva,
      })
      if (tulos.virhe) {
        setVirhe(tulos.virhe)
        return
      }
      onLuotu(tulos.tunniste)
    } catch (e) {
      setVirhe(e.message ?? 'Tallennus epäonnistui')
    } finally {
      setTallentaa(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl my-8">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-semibold text-gray-800">Tee uusi kenttä</h3>
            <p className="text-xs text-gray-500 mt-0.5">Lisätään kenttäkirjastoon ja heti pohjan osioon.</p>
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

          {/* Perustiedot */}
          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Otsikko (näkyy lomakkeessa) *</label>
            <input
              type="text"
              value={otsikko}
              onChange={(e) => setOtsikko(e.target.value)}
              placeholder="Esim. Aiemmat hoitomenetelmät"
              className={inputLuokka}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Tunniste (kentän id, esim. aiemmat_hoidot) *</label>
            <input
              type="text"
              value={tunniste}
              onChange={(e) => { setTunniste(e.target.value); setTunnisteMuokattu(true) }}
              placeholder="aiemmat_hoidot"
              className={`${inputLuokka} font-mono text-xs`}
            />
            <p className="text-xs text-gray-400">
              Generoidaan otsikosta automaattisesti — voit muokata käsin.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Kenttätyyppi *</label>
            <select
              value={tyyppi}
              onChange={(e) => setTyyppi(e.target.value)}
              className={`${inputLuokka} bg-white`}
            >
              {KENTTATYYPIT.map((t) => (
                <option key={t.arvo} value={t.arvo}>{t.nimi}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelLuokka}>Apurivi (näkyy kentän alla)</label>
            <input
              type="text"
              value={apurivi}
              onChange={(e) => setApurivi(e.target.value)}
              placeholder="Esim. Kerro mitä hoitomenetelmiä olet kokeillut"
              className={inputLuokka}
            />
          </div>

          {/* Pysyvyys (AB-T1b) — kentän käyttäytyminen "Aloita uusi käynti" -toiminnossa */}
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={pysyva}
              onChange={(e) => setPysyva(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-brand-600 cursor-pointer flex-shrink-0"
            />
            <span className="select-none leading-snug">
              Pysyvä — kentän arvo säilyy seuraavalle käynnille
              <span className="block text-xs text-gray-400 mt-0.5">
                Hallinnoidaan myöhemmin Asetukset → Kenttäkirjasto -näkymästä.
              </span>
            </span>
          </label>

          {/* Placeholder vain niissä tyypeissä joihin se sopii */}
          {['tekstirivi', 'tekstikentta', 'sahkoposti', 'puhelin', 'numero'].includes(tyyppi) && (
            <div className="flex flex-col gap-1">
              <label className={labelLuokka}>Esimerkkiteksti (placeholder)</label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Esim. Hieronta, kiropraktikko, fysioterapia"
                className={inputLuokka}
              />
            </div>
          )}

          {/* Infoteksti-kohtaiset asetukset */}
          {tyyppi === 'infoteksti' && (
            <div className="flex flex-col gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Infoteksti-asetukset</p>
              <div className="flex flex-col gap-1">
                <label className={labelLuokka}>Sisältö (näytetään lomakkeessa)</label>
                <textarea
                  value={infoSisalto}
                  onChange={(e) => setInfoSisalto(e.target.value)}
                  placeholder="Esim. Tämä lomake on tarkoitettu jäsenkorjausta varten. Hoito kestää noin 60 minuuttia. Pukeudu mukavasti."
                  rows={4}
                  className={`${inputLuokka} resize-y`}
                />
                <p className="text-xs text-gray-500">
                  Otsikko ja sisältö näkyvät lomakkeessa harmaana laatikkona. Käytetään palvelukuvaukseen, lisäohjeisiin tai väliotsikoihin. Ei syötettä asiakkaalle.
                </p>
              </div>
            </div>
          )}

          {/* Numero-kohtaiset asetukset */}
          {tyyppi === 'numero' && (
            <div className="flex flex-col gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Numero-asetukset</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Min</label>
                  <input type="number" value={numeroMin} onChange={(e) => setNumeroMin(e.target.value)} placeholder="(ei rajaa)" className={inputLuokka} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Max</label>
                  <input type="number" value={numeroMax} onChange={(e) => setNumeroMax(e.target.value)} placeholder="(ei rajaa)" className={inputLuokka} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelLuokka}>Yksikkö (esim. cm, kg, vuotta)</label>
                <input type="text" value={numeroYksikko} onChange={(e) => setNumeroYksikko(e.target.value)} placeholder="(ei yksikköä)" className={inputLuokka} />
              </div>
            </div>
          )}

          {/* Liukusäätimen asetukset */}
          {tyyppi === 'liukusaadin' && (
            <div className="flex flex-col gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Liukusäädin-asetukset</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Min</label>
                  <input type="number" value={saadinMin} onChange={(e) => setSaadinMin(e.target.value)} className={inputLuokka} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Max</label>
                  <input type="number" value={saadinMax} onChange={(e) => setSaadinMax(e.target.value)} className={inputLuokka} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Askel</label>
                  <input type="number" value={saadinAskel} onChange={(e) => setSaadinAskel(e.target.value)} className={inputLuokka} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Min-pään ohje</label>
                  <input type="text" value={saadinOhjeMin} onChange={(e) => setSaadinOhjeMin(e.target.value)} placeholder="ei kipua" className={inputLuokka} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelLuokka}>Max-pään ohje</label>
                  <input type="text" value={saadinOhjeMax} onChange={(e) => setSaadinOhjeMax(e.target.value)} placeholder="sietämätön" className={inputLuokka} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelLuokka}>Värikoodaus</label>
                <select value={saadinVari} onChange={(e) => setSaadinVari(e.target.value)} className={`${inputLuokka} bg-white`}>
                  {VARIKOODAUS_VAIHTOEHDOT.map((v) => (
                    <option key={v.arvo} value={v.arvo}>{v.nimi}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Checkbox-lista */}
          {tyyppi === 'checkbox_lista' && (
            <div className="flex flex-col gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Listan asetukset</p>
              <div className="flex flex-col gap-1">
                <label className={labelLuokka}>Mistä lista täytetään?</label>
                <select value={listaLahde} onChange={(e) => setListaLahde(e.target.value)} className={`${inputLuokka} bg-white`}>
                  {CHECKBOX_LISTA_LAHTEET.map((v) => (
                    <option key={v.arvo} value={v.arvo}>{v.nimi}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Toistaiseksi vain sairauslista on tuettu lähteenä.
                </p>
              </div>
            </div>
          )}

          {/* Linjausmittari (Pala 1) — valitaan mistä MITTARIT-listan mittarista on kyse */}
          {tyyppi === 'linjausmittari' && (
            <div className="flex flex-col gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Linjausmittari-asetukset</p>
              <div className="flex flex-col gap-1">
                <label className={labelLuokka}>Mikä mittari?</label>
                <select
                  value={linjausmittariSarake}
                  onChange={(e) => setLinjausmittariSarake(e.target.value)}
                  className={`${inputLuokka} bg-white`}
                >
                  {MITTARIT.map((m) => (
                    <option key={m.sarake} value={m.sarake}>
                      {m.nimi} ({m.yksikko})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Mittarin asteikko, normaalialue ja yksikkö tulevat automaattisesti
                  <code className="mx-1">data/linjausmittarit.js</code>:stä.
                </p>
              </div>
            </div>
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
            disabled={
              tallentaa ||
              !tunniste.trim() ||
              (tyyppi === 'infoteksti'
                ? (!otsikko.trim() && !infoSisalto.trim())
                : !otsikko.trim())
            }
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {tallentaa ? 'Tallennetaan…' : 'Luo kenttä'}
          </button>
        </div>
      </div>
    </div>
  )
}
