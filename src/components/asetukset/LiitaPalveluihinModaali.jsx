// Modaali pohjan liittämiseen palveluihin (N:M-suhde).
// Käyttäjä rastittaa palvelut joille pohja kuuluu, ja merkitsee yhden oletuspohjaksi
// per palvelu (jos haluaa).

import { useState, useEffect, useMemo } from 'react'
import { haePalvelut } from '../../lib/db'

export default function LiitaPalveluihinModaali({ alkuLinkit, onTallenna, onSulje }) {
  const [palvelut, setPalvelut]   = useState([])
  const [linkit,   setLinkit]     = useState(alkuLinkit ?? []) // [{ palvelu_id, on_oletus }]
  const [lataa,    setLataa]      = useState(true)
  const [virhe,    setVirhe]      = useState(null)

  useEffect(() => {
    let peruttu = false
    setLataa(true)
    haePalvelut()
      .then((lista) => {
        if (peruttu) return
        setPalvelut(lista.filter((p) => p.aktiivinen))
        setVirhe(null)
      })
      .catch((e) => { if (!peruttu) setVirhe(e.message ?? 'Lataus epäonnistui') })
      .finally(() => { if (!peruttu) setLataa(false) })
    return () => { peruttu = true }
  }, [])

  const linkitMap = useMemo(() => {
    const map = new Map()
    for (const l of linkit) map.set(l.palvelu_id, l)
    return map
  }, [linkit])

  function toggleRasti(palveluId) {
    if (linkitMap.has(palveluId)) {
      setLinkit(linkit.filter((l) => l.palvelu_id !== palveluId))
    } else {
      setLinkit([...linkit, { palvelu_id: palveluId, on_oletus: false }])
    }
  }

  function asetaOletus(palveluId, onOletus) {
    setLinkit(linkit.map((l) =>
      l.palvelu_id === palveluId ? { ...l, on_oletus: onOletus } : l
    ))
  }

  function tallenna() {
    onTallenna(linkit)
    onSulje()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Liitä palveluihin</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Mille palveluille tämä pohja kuuluu? Voit valita useita.
            </p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {lataa && <p className="text-sm text-gray-400 italic text-center py-4">Ladataan palveluja…</p>}
          {virhe && <p className="text-sm text-red-500 py-2">{virhe}</p>}

          {!lataa && palvelut.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-amber-900 mb-1">Ei palveluja</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Et ole vielä luonut yhtään palvelua. Mene Asetukset → Palvelut ja lisää
                ensimmäinen palvelu (esim. jäsenkorjaus, hieronta) ennen kuin voit liittää
                pohjia niihin.
              </p>
            </div>
          )}

          {!lataa && palvelut.length > 0 && (
            <ul className="flex flex-col gap-2">
              {palvelut.map((p) => {
                const linkki = linkitMap.get(p.id)
                const valittu = !!linkki
                return (
                  <li
                    key={p.id}
                    className={`rounded-lg border ${valittu ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white'} p-3 transition-colors`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={valittu}
                        onChange={() => toggleRasti(p.id)}
                        className="w-5 h-5 mt-0.5 accent-brand-600 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{p.nimi}</p>
                        {p.kuvaus && <p className="text-xs text-gray-500 mt-0.5">{p.kuvaus}</p>}
                      </div>
                    </label>
                    {valittu && (
                      <label className="flex items-center gap-2 mt-2 pl-8 cursor-pointer text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!linkki.on_oletus}
                          onChange={(e) => asetaOletus(p.id, e.target.checked)}
                          className="w-4 h-4 accent-brand-600 cursor-pointer"
                        />
                        <span>Tämä pohja on oletus tälle palvelulle</span>
                      </label>
                    )}
                  </li>
                )
              })}
            </ul>
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
            disabled={lataa}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Vahvista valinnat
          </button>
        </div>
      </div>
    </div>
  )
}
