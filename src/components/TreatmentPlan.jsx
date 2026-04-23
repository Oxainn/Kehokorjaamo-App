import { useState } from 'react'
import { buildPrompt, parseResponse } from '../services/api'

const TYYPPIVARI = {
  venyttely:   'bg-blue-50 text-blue-700',
  lämpöhoito:  'bg-orange-50 text-orange-700',
  kylmähoito:  'bg-cyan-50 text-cyan-700',
  liike:       'bg-green-50 text-green-700',
  ergonomia:   'bg-purple-50 text-purple-700',
  lepo:        'bg-gray-50 text-gray-600',
}

function TyyppiMerkki({ tyyppi }) {
  const cls = TYYPPIVARI[tyyppi] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {tyyppi}
    </span>
  )
}

function Osio({ otsikko, lapset }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 text-base mb-4">{otsikko}</h3>
      {lapset}
    </div>
  )
}

export default function TreatmentPlan({ findings = [], onResult }) {
  const [tulos, setTulos]     = useState(null)
  const [vaihe, setVaihe]     = useState('odottaa')
  const [vastaus, setVastaus] = useState('')

  const kopioi = async () => {
    const prompt = buildPrompt(findings)
    await navigator.clipboard.writeText(prompt)
    setVaihe('kopioitu')
    setVastaus('')
    setTulos(null)
  }

  const käytäVastausta = () => {
    const result = parseResponse(vastaus)
    setTulos(result)
    setVaihe('tulos')
    onResult?.(result)
  }

  const nollaa = () => {
    setTulos(null)
    setVaihe('odottaa')
    setVastaus('')
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Hoitosuunnitelma</h2>
        <p className="mt-1 text-gray-500 text-sm">
          AI-avusteinen analyysi kehon kartoituslöydöksistä.
        </p>
      </div>

      {/* ── TILA 1: odottaa ── */}
      {vaihe === 'odottaa' && (
        <>
          {findings.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">
                Lisää ensin löydöksiä <strong>Kehokartalla</strong> ja paina
                <strong> Analysoi löydökset</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold text-gray-800">{findings.length} löydöstä</span> valmiina
                analysoitavaksi:
              </p>

              <ul className="space-y-1 mb-5">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{f.alue}</span>
                    <span className={`font-semibold text-xs px-1.5 py-0.5 rounded
                      ${f.kipu === 0   ? 'text-blue-600 bg-blue-50'
                      : f.kipu <= 3   ? 'text-green-700 bg-green-50'
                      : f.kipu <= 6   ? 'text-orange-700 bg-orange-50'
                      : 'text-red-700 bg-red-50'}`}
                    >
                      VAS {f.kipu}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={kopioi}
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

      {/* ── TILA 2: kopioitu ── */}
      {vaihe === 'kopioitu' && (
        <div className="flex flex-col gap-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center gap-3">
            <span className="text-brand-600 text-lg">✓</span>
            <p className="text-sm font-semibold text-brand-800">Prompt kopioitu leikepöydälle</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <ol className="space-y-1 text-sm text-gray-600 mb-5">
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600 w-4">1.</span>
                Avaa <span className="font-medium text-gray-800">Claude.ai</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600 w-4">2.</span>
                Liitä viesti (<kbd className="bg-gray-100 px-1 rounded text-xs">Ctrl+V</kbd>)
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600 w-4">3.</span>
                Kopioi Clauden vastaus
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600 w-4">4.</span>
                Liitä alla olevaan kenttään
              </li>
            </ol>

            <textarea
              value={vastaus}
              onChange={(e) => setVastaus(e.target.value)}
              rows={8}
              placeholder="Liitä Clauden vastaus tähän..."
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />

            <button
              onClick={käytäVastausta}
              disabled={!vastaus.trim()}
              className="mt-3 w-full py-3 font-semibold rounded-xl transition-colors shadow-sm
                disabled:bg-gray-100 disabled:text-gray-400
                enabled:bg-brand-600 enabled:hover:bg-brand-700 enabled:text-white"
            >
              Käytä vastausta →
            </button>
          </div>

          <button
            onClick={nollaa}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-2"
          >
            ← Palaa löydöksiin
          </button>
        </div>
      )}

      {/* ── TILA 3: tulos ── */}
      {vaihe === 'tulos' && tulos && (
        <div className="flex flex-col gap-4">
          <Osio otsikko="Yhteenveto" lapset={
            <p className="text-sm text-gray-700 leading-relaxed">{tulos.yhteenveto}</p>
          } />

          {tulos.aiheuttajat?.length > 0 && (
            <Osio otsikko="Miksi kipu esiintyy juuri näissä kohdissa?" lapset={
              <ul className="space-y-2">
                {tulos.aiheuttajat.map((syy, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-brand-600 font-bold mt-0.5">·</span>
                    <span>{syy}</span>
                  </li>
                ))}
              </ul>
            } />
          )}

          {tulos.toimenpiteet?.length > 0 && (
            <Osio otsikko="Käsittelyjärjestys" lapset={
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
            } />
          )}

          {tulos.jalkihoito?.length > 0 && (
            <Osio otsikko="Jälkihoito-ohjeet kotiin" lapset={
              <ul className="space-y-4">
                {tulos.jalkihoito.map((j, i) => (
                  <li key={i} className="flex gap-3">
                    <TyyppiMerkki tyyppi={j.tyyppi} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">{j.ohje}</p>
                      {j.toistot && (
                        <p className="text-xs text-gray-400 mt-1">{j.toistot}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            } />
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
