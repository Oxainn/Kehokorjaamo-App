import { useState, useRef } from 'react'

const STORAGE_KEY = 'kehokorjaamo_asetukset'

const TYHJÄ_TERAPEUTTI = {
  etunimi: '', sukunimi: '', titteli: '', yritys: '',
  puhelin: '', sahkoposti: '', katuosoite: '',
  postinumero: '', kaupunki: '', nettisivu: '',
}

const TYHJÄ_INTEGRAATIOT = {
  vello:         '',
  calendly:      '',
  omanettisivu:  '',
}

const TYHJÄ_BRANDAYS = {
  paaVari:          '#1D9E75',
  toissijainenVari: '#185FA5',
  fontti:           'System',
  logo:             null,
}

const FONTIT = ['System', 'Inter', 'Roboto', 'Playfair Display']

function lueAsetukset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function tallennnaOsa(avain, data) {
  const asetukset = { ...lueAsetukset(), [avain]: data }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(asetukset))
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

function TallennaNappi({ tallennettu }) {
  return (
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

function VarausKortti({ label, name, value, onChange, placeholder, ohje }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <input
        type="url"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-400 leading-relaxed">{ohje}</p>
    </div>
  )
}

export default function Settings() {
  const [aukiOsio, setAukiOsio] = useState('terapeutti')
  const toggle = (id) => setAukiOsio(prev => prev === id ? null : id)

  // ── Osio 1 ────────────────────────────────────────────────────────────────
  const [terapeutti, setTerapeutti] = useState(() => ({
    ...TYHJÄ_TERAPEUTTI, ...lueAsetukset().terapeutti,
  }))
  const [tallennettu1, setTallennettu1] = useState(false)

  const päivitäTerapeutti = (e) => {
    const { name, value } = e.target
    setTerapeutti(prev => ({ ...prev, [name]: value }))
  }
  const tallennaTerapeutti = (e) => {
    e.preventDefault()
    tallennnaOsa('terapeutti', terapeutti)
    setTallennettu1(true)
    setTimeout(() => setTallennettu1(false), 2000)
  }

  // ── Osio 2 ────────────────────────────────────────────────────────────────
  const [integraatiot, setIntegraatiot] = useState(() => ({
    ...TYHJÄ_INTEGRAATIOT, ...lueAsetukset().integraatiot,
  }))
  const [tallennettu2, setTallennettu2] = useState(false)

  const päivitäIntegr = (e) => {
    const { name, value } = e.target
    setIntegraatiot(prev => ({ ...prev, [name]: value }))
  }
  const tallennaIntegr = (e) => {
    e.preventDefault()
    tallennnaOsa('integraatiot', integraatiot)
    setTallennettu2(true)
    setTimeout(() => setTallennettu2(false), 2000)
  }

  const OHJE = 'Tätä osoitetta käytetään esitietolomakkeen lähetyksen jälkeen ajanvaraukseen.'

  // ── Osio 3 ────────────────────────────────────────────────────────────────
  const [brandays, setBrandays] = useState(() => ({
    ...TYHJÄ_BRANDAYS, ...lueAsetukset().brandays,
  }))
  const [tallennettu3, setTallennettu3] = useState(false)
  const logoInputRef = useRef(null)

  const päivitäBrand = (e) => {
    const { name, value } = e.target
    setBrandays(prev => ({ ...prev, [name]: value }))
  }
  const käsitteleLogoValinta = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBrandays(prev => ({ ...prev, logo: ev.target.result }))
    reader.readAsDataURL(file)
  }
  const tallennaBrand = (e) => {
    e.preventDefault()
    tallennnaOsa('brandays', brandays)
    setTallennettu3(true)
    setTimeout(() => setTallennettu3(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asetukset</h2>
        <p className="mt-1 text-gray-500 text-sm">Mukauta sovellus omaan käyttöösi.</p>
      </div>

      {/* ── 1: Terapeutin tiedot ──────────────────────────────────────────── */}
      <AccordionOsio
        id="terapeutti" otsikko="Terapeutin tiedot" ikoni="👤"
        auki={aukiOsio === 'terapeutti'} onToggle={toggle}
        lapset={
          <form onSubmit={tallennaTerapeutti} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Etunimi"  name="etunimi"  value={terapeutti.etunimi}  onChange={päivitäTerapeutti} placeholder="Matti" />
              <TextInput label="Sukunimi" name="sukunimi" value={terapeutti.sukunimi} onChange={päivitäTerapeutti} placeholder="Meikäläinen" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Titteli" name="titteli" value={terapeutti.titteli} onChange={päivitäTerapeutti} placeholder="Jäsenkorjaaja" />
              <TextInput label="Yritys"  name="yritys"  value={terapeutti.yritys}  onChange={päivitäTerapeutti} placeholder="Kalevalapaja" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Puhelin"    name="puhelin"    value={terapeutti.puhelin}    onChange={päivitäTerapeutti} type="tel"   placeholder="+358 40 123 4567" />
              <TextInput label="Sähköposti" name="sahkoposti" value={terapeutti.sahkoposti} onChange={päivitäTerapeutti} type="email" placeholder="matti@esimerkki.fi" />
            </div>
            <TextInput label="Katuosoite" name="katuosoite" value={terapeutti.katuosoite} onChange={päivitäTerapeutti} placeholder="Esimerkkikatu 1" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <TextInput label="Postinumero" name="postinumero" value={terapeutti.postinumero} onChange={päivitäTerapeutti} placeholder="00100" />
              <div className="sm:col-span-2">
                <TextInput label="Kaupunki" name="kaupunki" value={terapeutti.kaupunki} onChange={päivitäTerapeutti} placeholder="Helsinki" />
              </div>
            </div>
            <TextInput label="Nettisivu" name="nettisivu" value={terapeutti.nettisivu} onChange={päivitäTerapeutti} type="url" placeholder="https://kalevalapaja.fi" />
            <TallennaNappi tallennettu={tallennettu1} />
          </form>
        }
      />

      {/* ── 2: Integraatiot ──────────────────────────────────────────────── */}
      <AccordionOsio
        id="integraatiot" otsikko="Integraatiot" ikoni="🔗"
        auki={aukiOsio === 'integraatiot'} onToggle={toggle}
        lapset={
          <form onSubmit={tallennaIntegr} className="flex flex-col gap-3">
            <VarausKortti
              label="Vello"
              name="vello"
              value={integraatiot.vello}
              onChange={päivitäIntegr}
              placeholder="https://vello.fi/sinunnimesi"
              ohje={OHJE}
            />
            <VarausKortti
              label="Calendly"
              name="calendly"
              value={integraatiot.calendly}
              onChange={päivitäIntegr}
              placeholder="https://calendly.com/sinunnimesi"
              ohje={OHJE}
            />
            <VarausKortti
              label="Oma nettisivu"
              name="omanettisivu"
              value={integraatiot.omanettisivu}
              onChange={päivitäIntegr}
              placeholder="https://kalevalapaja.fi/varaa"
              ohje={OHJE}
            />
            <TallennaNappi tallennettu={tallennettu2} />
          </form>
        }
      />

      {/* ── 3: Brändäys ──────────────────────────────────────────────────── */}
      <AccordionOsio
        id="brandays" otsikko="Brändäys" ikoni="🎨"
        auki={aukiOsio === 'brandays'} onToggle={toggle}
        lapset={
          <form onSubmit={tallennaBrand} className="flex flex-col gap-5">

            {/* Logo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {brandays.logo && (
                  <img
                    src={brandays.logo}
                    alt="Logo"
                    className="h-12 w-auto rounded border border-gray-100 object-contain bg-gray-50 p-1"
                  />
                )}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-700 transition-colors"
                >
                  {brandays.logo ? 'Vaihda logo' : 'Lataa logo'}
                </button>
                {brandays.logo && (
                  <button
                    type="button"
                    onClick={() => setBrandays(prev => ({ ...prev, logo: null }))}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Poista
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  className="hidden"
                  onChange={käsitteleLogoValinta}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG tai SVG</p>
            </div>

            {/* Värit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Pääväri
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="paaVari"
                    value={brandays.paaVari}
                    onChange={päivitäBrand}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm font-mono text-gray-600">{brandays.paaVari}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Toissijainen väri
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="toissijainenVari"
                    value={brandays.toissijainenVari}
                    onChange={päivitäBrand}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm font-mono text-gray-600">{brandays.toissijainenVari}</span>
                </div>
              </div>
            </div>

            {/* Fontti */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Fontti
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONTIT.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBrandays(prev => ({ ...prev, fontti: f }))}
                    style={{ fontFamily: f === 'System' ? 'system-ui, sans-serif' : f }}
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm transition-colors ${
                      brandays.fontti === f
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <TallennaNappi tallennettu={tallennettu3} />
          </form>
        }
      />

      {/* ── 4: Tiedot ja tallennus ───────────────────────────────────────── */}
      <AccordionOsio
        id="tallennus" otsikko="Tiedot ja tallennus" ikoni="💾"
        auki={aukiOsio === 'tallennus'} onToggle={toggle}
        lapset={
          <p className="text-sm text-gray-400 py-2">
            Varmuuskopiointi ja tietojen vienti — tulossa pian.
          </p>
        }
      />
    </div>
  )
}
