import { useState } from 'react'
import { buildPrompt, parseResponse } from '../services/api'

const TYYPPIVARI = {
  venyttely:  'bg-blue-50 text-blue-700',
  lämpöhoito: 'bg-orange-50 text-orange-700',
  kylmähoito: 'bg-cyan-50 text-cyan-700',
  liike:      'bg-green-50 text-green-700',
  ergonomia:  'bg-purple-50 text-purple-700',
  lepo:       'bg-gray-50 text-gray-600',
}

export default function TreatmentPlan({ findings = [], havainnot = null, onResult }) {
  const [vaihe, setVaihe]     = useState('odottaa')
  const [vastaus, setVastaus] = useState('')
  const [tulos, setTulos]     = useState(null)

  // ── Vaihe 1 → 2 ──────────────────────────────────────────────────────────
  const analysoi = async () => {
    const prompt = buildPrompt(findings, havainnot)
    await navigator.clipboard.writeText(prompt)
    setVastaus('')
    setTulos(null)
    setVaihe('kopioitu')
  }

  // ── Vaihe 2 → 3 ──────────────────────────────────────────────────────────
  const käytäVastausta = () => {
    console.log("käytäVastausta kutsuttu, vastaus:", vastaus.substring(0, 100))
    const result = parseResponse(vastaus)
    setTulos(result)
    setVaihe('tulos')
    onResult?.(result)
  }

  // ── Palaa alkuun ──────────────────────────────────────────────────────────
  const nollaa = () => {
    setVaihe('odottaa')
    setVastaus('')
    setTulos(null)
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Hoitosuunnitelma</h2>
        <p className="mt-1 text-gray-500 text-sm">
          AI-avusteinen analyysi kehon kartoituslöydöksistä.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VAIHE 1 — odottaa
      ════════════════════════════════════════════════════════════════════ */}
      {vaihe === 'odottaa' && (
        <>
          {findings.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">
                Tee ensin kehon kartoitus <strong>Kehokartta</strong>-välilehdellä.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold text-gray-800">{findings.length} löydöstä</span>{' '}
                valmiina analysoitavaksi:
              </p>
              <ul className="space-y-1 mb-5">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{f.alue}</span>
                    <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                      f.kipu === 0   ? 'text-blue-600 bg-blue-50'
                      : f.kipu <= 3 ? 'text-green-700 bg-green-50'
                      : f.kipu <= 6 ? 'text-orange-700 bg-orange-50'
                      : 'text-red-700 bg-red-50'
                    }`}>
                      VAS {f.kipu}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { console.log("Analysoi painettu, vaihdetaan tilaan kopioitu"); analysoi() }}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Analysoi AI:lla →
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">
                Analyysi vie noin 30 sekuntia
              </p>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VAIHE 2 — kopioitu
      ════════════════════════════════════════════════════════════════════ */}
      {vaihe === 'kopioitu' && (
        <div className="flex flex-col gap-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-brand-800">
              ✓ Prompt kopioitu leikepöydälle
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <ol className="space-y-2 text-sm text-gray-600 mb-5">
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">1.</span>
                Avaa <strong className="text-gray-800">Claude.ai</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">2.</span>
                Liitä prompt{' '}
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+V</kbd>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">3.</span>
                Kopioi Clauden vastaus
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">4.</span>
                Liitä alle ja paina <strong>Käytä vastausta</strong>
              </li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
              <button
                type="button"
                onClick={async () => {
                  const prompt = buildPrompt(findings, havainnot)
                  await navigator.clipboard.writeText(prompt)
                }}
                className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Kopioi
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = await navigator.clipboard.readText()
                  setVastaus(text)
                }}
                className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Liitä leikepöydältä
              </button>
            </div>
            <textarea
              value={vastaus}
              onChange={(e) => setVastaus(e.target.value)}
              style={{ width: '100%', minHeight: '120px' }}
              placeholder="Liitä Clauden vastaus tähän..."
              className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />

            {(() => {
              const voidaanKayttaa = vastaus.trim().length > 50
              return (
                <>
                  <button
                    type="button"
                    onClick={käytäVastausta}
                    style={{
                      opacity: voidaanKayttaa ? 1 : 0.4,
                      pointerEvents: voidaanKayttaa ? 'auto' : 'none',
                      cursor: voidaanKayttaa ? 'pointer' : 'not-allowed',
                    }}
                    className="mt-3 w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    Käytä vastausta →
                  </button>
                  {!voidaanKayttaa && (
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Liitä ensin Clauden vastaus tekstikenttään
                    </p>
                  )}
                </>
              )
            })()}
          </div>

          <button
            onClick={nollaa}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-2"
          >
            ← Palaa löydöksiin
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VAIHE 3 — tulos
      ════════════════════════════════════════════════════════════════════ */}
      {vaihe === 'tulos' && tulos && (
        <div className="flex flex-col gap-4">

          {/* Yhteenveto */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 text-base mb-3">Yhteenveto</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{tulos.yhteenveto}</p>
          </div>

          {/* Aiheuttajat */}
          {tulos.aiheuttajat?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-base mb-3">
                Miksi kipu esiintyy juuri näissä kohdissa?
              </h3>
              <ul className="space-y-2">
                {tulos.aiheuttajat.map((syy, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-brand-600 font-bold mt-0.5">·</span>
                    <span>{syy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Toimenpiteet */}
          {tulos.toimenpiteet?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-base mb-3">Käsittelyjärjestys</h3>
              <ol className="space-y-4">
                {tulos.toimenpiteet.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {t.jarjestys ?? i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-800">{t.rakenne}</span>
                        {t.puoli && t.puoli !== 'molemmat' && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {t.puoli}
                          </span>
                        )}
                      </div>
                      {t.tekniikka && (
                        <p className="text-xs font-medium text-brand-700 mb-1">{t.tekniikka}</p>
                      )}
                      <p className="text-sm text-gray-600 leading-relaxed">{t.selitys}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Jälkihoito */}
          {tulos.jalkihoito?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-base mb-3">
                Jälkihoito-ohjeet kotiin
              </h3>
              <ul className="space-y-4">
                {tulos.jalkihoito.map((j, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                      TYYPPIVARI[j.tyyppi] ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {j.tyyppi}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">{j.ohje}</p>
                      {j.toistot && (
                        <p className="text-xs text-gray-400 mt-1">{j.toistot}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={nollaa}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-2"
          >
            ← Palaa löydöksiin
          </button>
        </div>
      )}
    </section>
  )
}
