// Kotisivun linkit -näkymä Asetuksiin.
// Listaa URL:t jotka hoitajan pitää lisätä kotisivulle / ulkoisiin kanaviin —
// esim. "Varaa aika" -nappi joka vie julkiselle palveluvalintasivulle.
//
// Lista on rakennettu kasvavaksi: kun uusia julkisia näkymiä tulee
// (esim. asiakasportaali Vaihe C:ssä), lisää uusi rivi LINKIT-listaan.

import { useState } from 'react'

// Linkin polku on suhteellinen — origin saadaan window.location.origin:sta
// jotta sama lista toimii sekä localhostissa että tuotannossa.
const LINKIT = [
  {
    id:      'uusi-asiakas',
    nimi:    'Uuden asiakkaan ajanvaraus',
    kuvaus:  'Kotisivun "Varaa aika" -napin kohde. Asiakas valitsee palvelun ja täyttää lomakkeen ennen Vello-varausta.',
    polku:   '/uusi-asiakas',
  },
]

function LinkkiRivi({ linkki }) {
  const [tila, setTila] = useState(null) // null | 'ok' | 'virhe'

  const koko = typeof window !== 'undefined'
    ? `${window.location.origin}${linkki.polku}`
    : linkki.polku

  async function kopioi() {
    try {
      await navigator.clipboard.writeText(koko)
      setTila('ok')
    } catch {
      setTila('virhe')
    }
    setTimeout(() => setTila(null), 2000)
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-700">{linkki.nimi}</p>
      {linkki.kuvaus && (
        <p className="text-xs text-gray-500 leading-relaxed">{linkki.kuvaus}</p>
      )}
      <div className="flex items-stretch gap-2 flex-wrap">
        <input
          type="text"
          value={koko}
          readOnly
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={`${linkki.nimi} -linkki`}
        />
        <button
          type="button"
          onClick={kopioi}
          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            tila === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : tila === 'virhe'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:border-brand-500 hover:text-brand-700'
          }`}
          aria-live="polite"
        >
          {tila === 'ok' ? (
            <><span>✓</span><span>Kopioitu!</span></>
          ) : tila === 'virhe' ? (
            <><span>⚠</span><span>Ei onnistunut</span></>
          ) : (
            <><span>📋</span><span>Kopioi</span></>
          )}
        </button>
      </div>
    </div>
  )
}

export default function KotisivunLinkit() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 leading-relaxed">
        Linkit jotka voit liittää kotisivulle, sähköposteihin tai some-kanaviin.
        Linkit toimivat sellaisinaan eivätkä vaadi asiakkaalta kirjautumista.
      </p>

      <ul className="flex flex-col gap-3 list-none p-0 m-0">
        {LINKIT.map((l) => (
          <li key={l.id}>
            <LinkkiRivi linkki={l} />
          </li>
        ))}
      </ul>
    </div>
  )
}
