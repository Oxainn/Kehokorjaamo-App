import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kehokorjaamo_asetukset'

const TYHJÄ_TERAPEUTTI = {
  etunimi:      '',
  sukunimi:     '',
  titteli:      '',
  yritys:       '',
  puhelin:      '',
  sahkoposti:   '',
  katuosoite:   '',
  postinumero:  '',
  kaupunki:     '',
  nettisivu:    '',
}

function lueAsetukset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function TextInput({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  )
}

function AccordionOsio({ id, otsikko, ikoni, auki, onToggle, lapset }) {
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
          <div className="flex flex-col gap-4 pt-4">{lapset}</div>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [aukiOsio, setAukiOsio]   = useState('terapeutti')
  const [terapeutti, setTerapeutti] = useState(() => ({
    ...TYHJÄ_TERAPEUTTI,
    ...lueAsetukset().terapeutti,
  }))
  const [tallennettu, setTallennettu] = useState(false)

  const toggle = (id) => setAukiOsio(prev => prev === id ? null : id)

  const päivitä = (e) => {
    const { name, value } = e.target
    setTerapeutti(prev => ({ ...prev, [name]: value }))
  }

  const tallenna = (e) => {
    e.preventDefault()
    const asetukset = { ...lueAsetukset(), terapeutti }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(asetukset))
    setTallennettu(true)
    setTimeout(() => setTallennettu(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asetukset</h2>
        <p className="mt-1 text-gray-500 text-sm">Mukauta sovellus omaan käyttöösi.</p>
      </div>

      {/* ── 1: Terapeutin tiedot ──────────────────────────────────────────── */}
      <AccordionOsio
        id="terapeutti"
        otsikko="Terapeutin tiedot"
        ikoni="👤"
        auki={aukiOsio === 'terapeutti'}
        onToggle={toggle}
        lapset={
          <form onSubmit={tallenna} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Etunimi"  name="etunimi"  value={terapeutti.etunimi}  onChange={päivitä} placeholder="Matti" />
              <TextInput label="Sukunimi" name="sukunimi" value={terapeutti.sukunimi} onChange={päivitä} placeholder="Meikäläinen" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Titteli" name="titteli" value={terapeutti.titteli} onChange={päivitä} placeholder="Jäsenkorjaaja" />
              <TextInput label="Yritys"  name="yritys"  value={terapeutti.yritys}  onChange={päivitä} placeholder="Kalevalapaja" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Puhelin"     name="puhelin"     value={terapeutti.puhelin}     onChange={päivitä} type="tel"   placeholder="+358 40 123 4567" />
              <TextInput label="Sähköposti"  name="sahkoposti"  value={terapeutti.sahkoposti}  onChange={päivitä} type="email" placeholder="matti@esimerkki.fi" />
            </div>
            <TextInput label="Katuosoite" name="katuosoite" value={terapeutti.katuosoite} onChange={päivitä} placeholder="Esimerkkikatu 1" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <TextInput label="Postinumero" name="postinumero" value={terapeutti.postinumero} onChange={päivitä} placeholder="00100" />
              <div className="sm:col-span-2">
                <TextInput label="Kaupunki" name="kaupunki" value={terapeutti.kaupunki} onChange={päivitä} placeholder="Helsinki" />
              </div>
            </div>
            <TextInput label="Nettisivu" name="nettisivu" value={terapeutti.nettisivu} onChange={päivitä} type="url" placeholder="https://kalevalapaja.fi" />

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                Tallenna
              </button>
              {tallennettu && (
                <span className="text-sm text-green-600 font-medium">Tallennettu!</span>
              )}
            </div>
          </form>
        }
      />

      {/* ── 2: Integraatiot ──────────────────────────────────────────────── */}
      <AccordionOsio
        id="integraatiot"
        otsikko="Integraatiot"
        ikoni="🔗"
        auki={aukiOsio === 'integraatiot'}
        onToggle={toggle}
        lapset={
          <p className="text-sm text-gray-400 py-2">
            Varausjärjestelmien integraatiot — tulossa pian.
          </p>
        }
      />

      {/* ── 3: Brändäys ──────────────────────────────────────────────────── */}
      <AccordionOsio
        id="brandays"
        otsikko="Brändäys"
        ikoni="🎨"
        auki={aukiOsio === 'brandays'}
        onToggle={toggle}
        lapset={
          <p className="text-sm text-gray-400 py-2">
            Logo, värit ja typografia — tulossa pian.
          </p>
        }
      />

      {/* ── 4: Tiedot ja tallennus ───────────────────────────────────────── */}
      <AccordionOsio
        id="tallennus"
        otsikko="Tiedot ja tallennus"
        ikoni="💾"
        auki={aukiOsio === 'tallennus'}
        onToggle={toggle}
        lapset={
          <p className="text-sm text-gray-400 py-2">
            Varmuuskopiointi ja tietojen vienti — tulossa pian.
          </p>
        }
      />
    </div>
  )
}
