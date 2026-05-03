// Kenttäkirjaston hallintanäkymä — listaa kaikki kentät joita pohjat käyttävät.
//
// Pysyvyys (AB-T1b): hoitaja merkitsee per kenttä rastilla onko kentän arvo
// pysyvä (säilyy seuraavalle käynnille) vai muuttuva (tyhjenee uudessa käynnissä).
// Pysyvyys vaikuttaa KAIKKIIN lomakepohjiin jotka käyttävät kenttää.
//
// Muokkaa-modaali (label/tyyppi/validointi muokkaus) tulee mahdollisesti
// myöhempään vaiheeseen — tällä hetkellä vain pysyvyys hallittavissa täältä.
// Uusi kenttä luodaan edelleen LuoUusiKenttaModaali:n kautta lomakepohja-
// editorista (AB-T1b3 mahdollisesti laajentaa).

import { useState, useEffect, useMemo } from 'react'
import { haeKenttakirjasto, paivitaKentanPysyvyys } from '../../lib/db'

const KENTTATYYPPI_NIMET = {
  tekstirivi:    'Tekstirivi',
  tekstikentta:  'Tekstikenttä',
  sahkoposti:    'Sähköposti',
  puhelin:       'Puhelinnumero',
  paivamaara:    'Päivämäärä',
  numero:        'Numero',
  checkbox:      'Yksittäinen rasti',
  liukusaadin:   'Liukusäädin',
  checkbox_lista: 'Lista (rastit)',
  kehonkartta:   'Kehonkartta',
  allekirjoitus: 'Allekirjoitus',
  infoteksti:    'Infoteksti',
}

export default function Kenttakirjasto() {
  const [kentat,     setKentat]     = useState([])
  const [lataa,      setLataa]      = useState(true)
  const [virhe,      setVirhe]      = useState(null)
  const [hakusana,   setHakusana]   = useState('')
  // Per-kenttä loading-tila: { [kenttaId]: true } estää tuplaklikkauksen
  const [paivittaa,  setPaivittaa]  = useState({})

  useEffect(() => { hae() }, [])

  async function hae() {
    setLataa(true)
    setVirhe(null)
    try {
      const tulos = await haeKenttakirjasto()
      setKentat(tulos)
    } catch {
      setVirhe('Kenttäkirjaston haku epäonnistui')
    } finally {
      setLataa(false)
    }
  }

  async function togglePysyvyys(kentta) {
    const uusi = !kentta.pysyva
    setPaivittaa((p) => ({ ...p, [kentta.id]: true }))

    // Optimistinen päivitys — vaihdetaan UI:n tila ennen DB-vahvistusta
    setKentat((prev) => prev.map((k) =>
      k.id === kentta.id ? { ...k, pysyva: uusi } : k
    ))

    const tulos = await paivitaKentanPysyvyys(kentta.id, uusi)

    setPaivittaa((p) => {
      const { [kentta.id]: _, ...rest } = p
      return rest
    })

    if (tulos.virhe) {
      // Peruuta optimistinen muutos jos DB epäonnistui
      setKentat((prev) => prev.map((k) =>
        k.id === kentta.id ? { ...k, pysyva: !uusi } : k
      ))
      alert('Pysyvyyden päivitys epäonnistui: ' + tulos.virhe)
    }
  }

  const suodatetut = useMemo(() => {
    const haku = hakusana.trim().toLowerCase()
    if (!haku) return kentat
    return kentat.filter((k) =>
      k.otsikko.toLowerCase().includes(haku) ||
      k.tunniste.toLowerCase().includes(haku) ||
      (KENTTATYYPPI_NIMET[k.tyyppi] ?? '').toLowerCase().includes(haku)
    )
  }, [kentat, hakusana])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-gray-500 leading-relaxed">
          Hallitse kenttäkirjaston kenttiä. Pysyvyys vaikuttaa{' '}
          <span className="font-medium text-gray-700">kaikkiin lomakepohjiin</span> jotka
          käyttävät kenttää.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={hakusana}
          onChange={(e) => setHakusana(e.target.value)}
          placeholder="Hae nimellä, tunnisteella tai tyypillä…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {lataa && (
        <div className="text-sm text-gray-400 py-4 text-center">Ladataan…</div>
      )}
      {virhe && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {virhe}
        </div>
      )}

      {!lataa && !virhe && suodatetut.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-6">
          {hakusana
            ? `Ei kenttiä haulla "${hakusana}".`
            : 'Kenttäkirjasto on tyhjä — luo ensimmäinen kenttä lomakepohjaeditorista.'}
        </p>
      )}

      {!lataa && !virhe && suodatetut.length > 0 && (
        <ul className="flex flex-col gap-2">
          {suodatetut.map((k) => {
            const tyyppiNimi = KENTTATYYPPI_NIMET[k.tyyppi] ?? k.tyyppi
            const onPaivittamassa = !!paivittaa[k.id]
            return (
              <li
                key={k.id}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  k.pysyva
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">
                        {k.otsikko}
                      </span>
                      {k.pysyva && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium">
                          🔒 Pysyvä
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tyyppiNimi} · <code className="text-gray-400">{k.tunniste}</code>
                    </p>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer flex-shrink-0 max-w-[260px]">
                    <input
                      type="checkbox"
                      checked={!!k.pysyva}
                      onChange={() => togglePysyvyys(k)}
                      disabled={onPaivittamassa}
                      className="w-4 h-4 mt-0.5 accent-brand-600 cursor-pointer disabled:cursor-wait"
                      aria-label={`Merkitse "${k.otsikko}" pysyväksi`}
                    />
                    <span className="select-none leading-snug">
                      Pysyvä — kentän arvo säilyy seuraavalle käynnille
                    </span>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
