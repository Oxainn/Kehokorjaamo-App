// "Kehitys ja laadunvalvonta" — yhdistetty Asetukset-osio joka korvaa
// aiemmin erillään olleet Tuotehallinta + Versionhallinta + Kehittäjätyökalut.
//
// Sisältää 6 alaosiota:
//   🚀 Versionhallinta (Live ↔ Kehitys + audit-loki)
//   🎯 Visio ja periaatteet         ┐
//   💡 Koodaajan ideat              │ — nämä neljä tulevat ProductBoard-
//   📋 To Do                        │   komponentin sisäisistä accordioneista
//   📝 Changelog                    ┘
//   🔍 Laadunvalvonta-silmukka (uusi: tarkistuskierroksen käynnistys)

import { useState } from 'react'
import ProductBoard from '../ProductBoard'
import Versionhallinta from './Versionhallinta'
import LaadunvalvontaSilmukka from './LaadunvalvontaSilmukka'

export default function KehitysJaLaadunvalvonta({ hoitajaId }) {
  // Erillinen accordion-state Versionhallinnan ja Laadunvalvonnan ympärille.
  // ProductBoardilla on oma sisäinen aukiOsio-state sen 4 alaosiolle.
  const [aukiOsio, setAukiOsio] = useState(null)
  const toggle = (id) => setAukiOsio(prev => prev === id ? null : id)

  return (
    <div className="flex flex-col gap-3">
      <PaikallinenAccordion
        id="versionhallinta"
        otsikko="Versionhallinta"
        ikoni="🚀"
        auki={aukiOsio === 'versionhallinta'}
        onToggle={toggle}
      >
        <Versionhallinta />
      </PaikallinenAccordion>

      {/* ProductBoard sisältää itsessään 4 accordionia: Visio, Ideat, Todo, Changelog */}
      <ProductBoard hoitajaId={hoitajaId} hideHeader />

      <PaikallinenAccordion
        id="laadunvalvonta"
        otsikko="Laadunvalvonta-silmukka"
        ikoni="🔍"
        auki={aukiOsio === 'laadunvalvonta'}
        onToggle={toggle}
      >
        <LaadunvalvontaSilmukka kayttajaId={hoitajaId} />
      </PaikallinenAccordion>
    </div>
  )
}

// Sama tyyli kuin Settings.jsx:n AccordionOsio. Pidetään lokaalina
// jotta ei tuoda uutta riippuvuutta — muutokset tähän eivät vaikuta
// muihin osioihin.
function PaikallinenAccordion({ id, otsikko, ikoni, auki, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{ikoni}</span>
          <span className="font-semibold text-gray-800 text-sm">{otsikko}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${auki ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {auki && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="flex flex-col gap-4 pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}
