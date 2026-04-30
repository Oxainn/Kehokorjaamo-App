// Modaali kentän valitsemiseksi kenttäkirjastosta osion sisälle.
// Pala 2: vain olemassa olevien kenttien valinta. "Tee uusi kenttä" tulee Pala 4:ssa.

import { useState, useMemo } from 'react'

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
}

export default function LisaaKenttaModaali({ kenttakirjasto, kaytetytTunnisteet, onValitse, onSulje }) {
  const [hakusana, setHakusana] = useState('')

  const suodatetut = useMemo(() => {
    const haku = hakusana.trim().toLowerCase()
    if (!haku) return kenttakirjasto
    return kenttakirjasto.filter((k) =>
      k.otsikko.toLowerCase().includes(haku) ||
      k.tunniste.toLowerCase().includes(haku) ||
      (KENTTATYYPPI_NIMET[k.tyyppi] ?? '').toLowerCase().includes(haku)
    )
  }, [kenttakirjasto, hakusana])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Lisää kenttä</h3>
            <p className="text-xs text-gray-500 mt-0.5">Valitse kenttäkirjastosta. Käytössä olevat kentät ovat himmennettyjä.</p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            value={hakusana}
            onChange={(e) => setHakusana(e.target.value)}
            placeholder="Hae nimellä, tunnisteella tai tyypillä…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
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
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {k.otsikko}
                          </span>
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
  )
}
