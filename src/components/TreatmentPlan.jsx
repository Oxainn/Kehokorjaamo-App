import { useState } from 'react'
import { analyzeFindings } from '../services/api'

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

export default function TreatmentPlan({ findings = [] }) {
  const [tulos, setTulos]     = useState(null)
  const [ladataan, setLadataan] = useState(false)
  const [virhe, setVirhe]     = useState(null)

  const analysoi = async () => {
    setLadataan(true)
    setVirhe(null)
    setTulos(null)

    const result = await analyzeFindings(findings)

    setLadataan(false)

    if (result?.virhe) {
      setVirhe('Analyysi epäonnistui — tarkista yhteys')
    } else {
      setTulos(result)
    }
  }

  const nollaaTulos = () => { setTulos(null); setVirhe(null) }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Hoitosuunnitelma</h2>
        <p className="mt-1 text-gray-500 text-sm">
          AI-avusteinen analyysi kehon kartoituslöydöksistä.
        </p>
      </div>

      {/* Ei löydöksiä */}
      {findings.length === 0 && !tulos && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">
            Lisää ensin löydöksiä <strong>Kehokartalla</strong> ja paina
            <strong> Analysoi löydökset</strong>.
          </p>
        </div>
      )}

      {/* Löydökset odottaa analyysiä */}
      {findings.length > 0 && !tulos && !ladataan && (
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
                  ${f.kipu === 0    ? 'text-blue-600 bg-blue-50'
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
            onClick={analysoi}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Analysoi AI:lla →
          </button>
        </div>
      )}

      {/* Latausanimaatio */}
      {ladataan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 animate-pulse">Analysoidaan löydöksiä...</p>
        </div>
      )}

      {/* Virheviesti */}
      {virhe && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4">
          <p className="text-sm text-red-700 font-medium">{virhe}</p>
          <button
            onClick={analysoi}
            className="text-xs text-red-600 hover:text-red-800 underline whitespace-nowrap"
          >
            Yritä uudelleen
          </button>
        </div>
      )}

      {/* Tulokset */}
      {tulos && (
        <div className="flex flex-col gap-4">
          {/* Yhteenveto */}
          <Osio otsikko="Yhteenveto" lapset={
            <p className="text-sm text-gray-700 leading-relaxed">{tulos.yhteenveto}</p>
          } />

          {/* Aiheuttajat */}
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

          {/* Toimenpiteet */}
          {tulos.toimenpiteet?.length > 0 && (
            <Osio otsikko="Käsittelyjärjestys" lapset={
              <ol className="space-y-4">
                {tulos.toimenpiteet.map((t) => (
                  <li key={t.jarjestys} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {t.jarjestys}
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
                      <p className="text-xs font-medium text-brand-700 mb-1">{t.tekniikka}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{t.selitys}</p>
                    </div>
                  </li>
                ))}
              </ol>
            } />
          )}

          {/* Jälkihoito */}
          {tulos.jalkihoito?.length > 0 && (
            <Osio otsikko="Jälkihoito-ohjeet kotiin" lapset={
              <ul className="space-y-4">
                {tulos.jalkihoito.map((j, i) => (
                  <li key={i} className="flex gap-3">
                    <TyyppiMerkki tyyppi={j.tyyppi} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">{j.ohje}</p>
                      <p className="text-xs text-gray-400 mt-1">{j.toistot}</p>
                    </div>
                  </li>
                ))}
              </ul>
            } />
          )}

          {/* Uusi analyysi */}
          <button
            onClick={nollaaTulos}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-2"
          >
            ← Palaa löydöksiin
          </button>
        </div>
      )}
    </section>
  )
}
