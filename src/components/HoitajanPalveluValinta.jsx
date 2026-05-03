// AB-T5a: hoitajan palveluvalinta-modaali joka aukeaa "+ Uusi asiakas" -nappia
// klikatessa. Listaa AKTIIVISET palvelut joilla on aktiivinen lomakepohja —
// klikkaus välittää valitun palvelun parentille (esim. UusiKayntiContainer).
//
// Käyttää db/palvelut.js:n haePalvelut-funktiota (autentikoitu, näkee hoitajan
// kaikki palvelut). Eri kuin asiakkaan julkinen PalveluValinta.jsx joka käyttää
// Edge Function:ia ilman autentikointia.

import { useState, useEffect, useMemo } from 'react'
import { haePalvelut } from '../lib/db'

export default function HoitajanPalveluValinta({ auki, onValitse, onSulje }) {
  const [palvelut, setPalvelut] = useState([])
  const [lataa,    setLataa]    = useState(true)
  const [virhe,    setVirhe]    = useState(null)

  useEffect(() => {
    if (!auki) return
    let peruttu = false
    setLataa(true)
    setVirhe(null)
    haePalvelut()
      .then((tulos) => {
        if (peruttu) return
        setPalvelut(tulos)
        setLataa(false)
      })
      .catch((e) => {
        if (peruttu) return
        setVirhe(e?.message ?? 'Palveluiden lataus epäonnistui')
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [auki])

  // Suodata: vain aktiiviset palvelut joilla aktiivinen lomakepohja
  const valittavat = useMemo(() => palvelut.filter((p) =>
    p.aktiivinen && p.lomakepohja_id && p.lomakepohja?.aktiivinen
  ), [palvelut])

  if (!auki) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onSulje}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">Valitse palvelu</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Palvelu määrittää lomakepohjan jolle uusi käynti avautuu.
            </p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            aria-label="Sulje modaali"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {lataa && (
            <p className="text-sm text-gray-400 italic text-center py-8">
              Ladataan palveluita…
            </p>
          )}

          {!lataa && virhe && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠ {virhe}
            </div>
          )}

          {!lataa && !virhe && valittavat.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-relaxed">
              Ei valittavia palveluita. Tarkista <strong>Asetukset → Palvelut & lomakkeet</strong>:
              palveluilla pitää olla aktiivinen lomakepohja jotta ne näkyvät täällä.
            </div>
          )}

          {!lataa && !virhe && valittavat.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {valittavat.map((p) => {
                const meta = [
                  p.kesto_min  != null ? `${p.kesto_min} min` : null,
                  p.hinta_eur  != null ? `${p.hinta_eur} €`   : null,
                ].filter(Boolean).join(' · ')
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { onValitse(p); onSulje() }}
                      className="w-full text-left bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-xl p-4 transition-colors flex flex-col gap-2 min-h-[120px]"
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-semibold text-gray-800 text-sm leading-tight">
                          {p.nimi}
                        </span>
                        {p.kuvaus && (
                          <span className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                            {p.kuvaus}
                          </span>
                        )}
                      </div>
                      {meta && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 font-medium">{meta}</span>
                          <span className="text-xs text-brand-700 font-semibold">Valitse →</span>
                        </div>
                      )}
                      {!meta && (
                        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                          <span className="text-xs text-brand-700 font-semibold">Valitse →</span>
                        </div>
                      )}
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
            Peruuta
          </button>
        </div>
      </div>
    </div>
  )
}
