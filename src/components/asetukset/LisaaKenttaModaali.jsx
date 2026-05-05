// Modaali kentän valitsemiseksi kenttäkirjastosta osion sisälle.
// Yläosassa "Tee uusi kenttä" -nappi joka avaa LuoUusiKenttaModaalin.

import { useState, useMemo } from 'react'
import LuoUusiKenttaModaali from './LuoUusiKenttaModaali'

const KENTTATYYPPI_NIMET = {
  tekstirivi:    'Yksirivinen tekstikenttä',
  tekstikentta:  'Monirivinen tekstikenttä',
  sahkoposti:    'Sähköposti',
  puhelin:       'Puhelinnumero',
  paivamaara:    'Päivämäärä',
  numero:        'Numero',
  checkbox:      'Yksittäinen rasti',
  liukusaadin:   'Liukusäädin',
  checkbox_lista: 'Lista (rastit)',
  kehonkartta:   'Kehonkartta',
  allekirjoitus: 'Allekirjoitus',
  infoteksti:    'Infoteksti (staattinen)',
  kuvantaminen:  'Kuvantaminen (asentokuvat + AI)',
  linjausmittari:           'Linjausmittari (hoitajan asentokulma)',
  bodymap_havainnot:        'BodyMap-havainnot (hoitajan löydökset)',
  itsehoito_valinnat:       'Itsehoito-valinnat (käyntikohtainen)',
  ai_loydosanalyysi:        'AI-löydösanalyysi (Claude-tulkinta)',
  edellisen_kaynnin_muista: 'Edellisen käynnin Muista-nosto',
}

export default function LisaaKenttaModaali({ kenttakirjasto, kaytetytTunnisteet, onValitse, onUusiKenttaLuotu, onSulje }) {
  const [hakusana, setHakusana] = useState('')
  const [luoUusiAuki, setLuoUusiAuki] = useState(false)

  const suodatetut = useMemo(() => {
    const haku = hakusana.trim().toLowerCase()
    if (!haku) return kenttakirjasto
    return kenttakirjasto.filter((k) =>
      k.otsikko.toLowerCase().includes(haku) ||
      k.tunniste.toLowerCase().includes(haku) ||
      (KENTTATYYPPI_NIMET[k.tyyppi] ?? '').toLowerCase().includes(haku)
    )
  }, [kenttakirjasto, hakusana])

  function uusiKenttaLuotu(tunniste) {
    setLuoUusiAuki(false)
    if (onUusiKenttaLuotu) onUusiKenttaLuotu(tunniste)
    onSulje()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-800">Lisää kenttä</h3>
              <p className="text-xs text-gray-500 mt-0.5">Valitse kenttäkirjastosta tai tee uusi.</p>
            </div>
            <button
              type="button"
              onClick={onSulje}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={hakusana}
              onChange={(e) => setHakusana(e.target.value)}
              placeholder="Hae nimellä, tunnisteella tai tyypillä…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setLuoUusiAuki(true)}
              className="px-3 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors whitespace-nowrap"
              title="Tee kenttäkirjastoon uusi kenttä"
            >
              + Tee uusi
            </button>
          </div>

          <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
            {suodatetut.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">
                Ei kenttiä haulla &laquo;{hakusana}&raquo;.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {suodatetut.map((k) => {
                  const kaytetty = kaytetytTunnisteet.has(k.tunniste)
                  const tyyppiNimi = KENTTATYYPPI_NIMET[k.tyyppi] ?? k.tyyppi
                  return (
                    <li key={k.id}>
                      <button
                        type="button"
                        disabled={kaytetty}
                        onClick={() => { onValitse(k.tunniste); onSulje() }}
                        className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                          kaytetty
                            ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                {k.otsikko}
                              </span>
                              {k.pysyva && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium flex-shrink-0"
                                  title="Pysyvä — kentän arvo säilyy seuraavalle käynnille (muokataan Kenttäkirjastosta)"
                                >
                                  🔒 Pysyvä
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {tyyppiNimi} · <code className="text-gray-400">{k.tunniste}</code>
                            </span>
                          </div>
                          {kaytetty && (
                            <span className="text-xs text-gray-400 italic flex-shrink-0 mt-0.5">
                              jo lisätty
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onSulje}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Sulje
            </button>
          </div>
        </div>
      </div>

      {luoUusiAuki && (
        <LuoUusiKenttaModaali
          onLuotu={uusiKenttaLuotu}
          onSulje={() => setLuoUusiAuki(false)}
        />
      )}
    </>
  )
}
