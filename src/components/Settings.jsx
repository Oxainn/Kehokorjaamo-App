import { useState, useRef, Fragment } from 'react'
import { rakennaPbPäivitys } from '../utils/productboard'
import { supabase } from '../services/supabase'
import ProductBoard from './ProductBoard'
import KehonkarttaKalibrointi from './asetukset/KehonkarttaKalibrointi'

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

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}


const KYSYMYS_TYYPIT = [
  { id: 'teksti',     label: 'Lyhyt vastaus' },
  { id: 'tekstialue', label: 'Pitkä vastaus' },
  { id: 'kyllä_ei',  label: 'Kyllä / Ei'   },
]

const TYHJÄ_PALVELU = {
  id: '', nimi: '', kuvaus: '', aktiivinen: true,
}

const TYHJÄ_PALVELU_LOMAKE = { piilotetutOsiot: {}, lisaKysymykset: [] }

const OLETUS_PALVELUT = [
  {
    id: 'p1', nimi: 'Kalevalainen jäsenkorjaus', kuvaus: 'Manuaalinen kehon tasapainotus',
    aktiivinen: true, lomake: { piilotetutOsiot: {}, lisaKysymykset: [] },
  },
]

function lueAsetukset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function tallennaOsa(avain, data) {
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

export default function Settings({ hoitajaId }) {
  const [aukiOsio, setAukiOsio] = useState('terapeutti')
  const toggle = (id) => setAukiOsio(prev => prev === id ? null : id)
  const [devInput, setDevInput]   = useState('')
  const [devTila, setDevTila]     = useState(null)

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
    tallennaOsa('terapeutti', terapeutti)
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
    tallennaOsa('integraatiot', integraatiot)
    setTallennettu2(true)
    setTimeout(() => setTallennettu2(false), 2000)
  }

  const OHJE = 'Tätä osoitetta käytetään esitietolomakkeen lähetyksen jälkeen ajanvaraukseen.'

  // ── Palvelut ──────────────────────────────────────────────────────────────
  const [palvelut, setPalvelut] = useState(() => {
    const tallennettu = lueAsetukset().palvelut
    if (!tallennettu) return OLETUS_PALVELUT
    return tallennettu.map(p => ({ ...p, lomake: p.lomake ?? { ...TYHJÄ_PALVELU_LOMAKE } }))
  })
  const [muokkausId, setMuokkausId] = useState(null)
  const [tallennettuPalvelut, setTallennettuPalvelut] = useState(false)
  const tallennaPalvelut = (lista = palvelut) => {
    tallennaOsa('palvelut', lista)
    setTallennettuPalvelut(true)
    setTimeout(() => setTallennettuPalvelut(false), 2000)
  }

  const lisääPalvelu = () => {
    const uusi = { id: 'p' + Date.now(), nimi: 'Uusi palvelu', kuvaus: '', aktiivinen: true, lomake: { ...TYHJÄ_PALVELU_LOMAKE } }
    const päivitetty = [...palvelut, uusi]
    setPalvelut(päivitetty)
    tallennaPalvelut(päivitetty)
  }

  const poistaPalvelu = (id) => {
    const päivitetty = palvelut.filter(p => p.id !== id)
    setPalvelut(päivitetty)
    tallennaPalvelut(päivitetty)
  }

  const päivitäPalvelu = (id, kenttä, arvo) => {
    const päivitetty = palvelut.map(p => p.id === id ? { ...p, [kenttä]: arvo } : p)
    setPalvelut(päivitetty)
  }

  // ── Per-palvelu lomakerakentaja ───────────────────────────────────────────
  const [uusiKys, setUusiKys] = useState({})
  const [muokkausKysId, setMuokkausKysId]       = useState(null)
  const [muokkausKysTeksti, setMuokkausKysTeksti] = useState('')
  const [muokkausOsio, setMuokkausOsio]               = useState(null)
  const [muokkausOsioKuvaus, setMuokkausOsioKuvaus]   = useState(null)
  // muokkausOsio: { pid, osioId, nimi } | null
  // muokkausOsioKuvaus: { pid, osioId, teksti } | null

  const tallennaMuokkausOsioKuvaus = (palveluId, osioId) => {
    const p = palvelut.find(x => x.id === palveluId)
    const osioKuvaukset = { ...p.lomake?.osioKuvaukset, [osioId]: muokkausOsioKuvaus.teksti }
    päivitäPalvelu(palveluId, 'lomake', { ...p.lomake, osioKuvaukset })
    setMuokkausOsioKuvaus(null)
  }

  const tallennaMuokkausOsio = (palveluId, osioId) => {
    if (!muokkausOsio?.nimi.trim()) { setMuokkausOsio(null); return }
    const p = palvelut.find(x => x.id === palveluId)
    const osioNimet = { ...p.lomake?.osioNimet, [osioId]: muokkausOsio.nimi.trim() }
    päivitäPalvelu(palveluId, 'lomake', { ...p.lomake, osioNimet })
    setMuokkausOsio(null)
  }

  const tallennaMuokkausKys = (palveluId, kysymysId) => {
    if (!muokkausKysTeksti.trim()) return
    const p = palvelut.find(p => p.id === palveluId)
    const qs = (p?.lomake?.lisaKysymykset ?? []).map(k =>
      k.id === kysymysId ? { ...k, otsikko: muokkausKysTeksti.trim() } : k
    )
    päivitäPalvelu(palveluId, 'lomake', { ...p.lomake, lisaKysymykset: qs })
    setMuokkausKysId(null)
  }

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
    tallennaOsa('brandays', brandays)
    setTallennettu3(true)
    setTimeout(() => setTallennettu3(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asetukset</h2>
        <p className="mt-1 text-gray-500 text-sm">Mukauta sovellus omaan käyttöösi.</p>
      </div>

      {/* ── KÄYTTÄJÄHALLINTA ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mb-2">Käyttäjähallinta</p>
      </div>

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

      {/* ── 4: Palvelut ──────────────────────────────────────────────────── */}
      <AccordionOsio
        id="palvelut" otsikko="Palvelut" ikoni="🏥"
        auki={aukiOsio === 'palvelut'} onToggle={toggle}
        lapset={
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

            {palvelut.map(p => (
              <div key={p.id} style={{
                border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px',
                display:'flex',flexDirection:'column',gap:'8px'
              }}>
                <div>
                  <label style={{fontSize:'11px',color:'#666',display:'block',marginBottom:'3px'}}>Palvelun nimi</label>
                  <input
                    value={p.nimi}
                    onChange={e => päivitäPalvelu(p.id,'nimi',e.target.value)}
                    style={{width:'100%',fontSize:'14px',fontWeight:'500',padding:'6px 8px',borderRadius:'6px',border:'1px solid #e2e8f0'}}
                  />
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'#666',display:'block',marginBottom:'3px'}}>Palvelun kuvaus (näkyy asiakkaalle)</label>
                  <textarea
                    value={p.kuvaus}
                    placeholder="Kirjoita palvelun kuvaus..."
                    onChange={e => päivitäPalvelu(p.id,'kuvaus',e.target.value)}
                    rows={4}
                    style={{width:'100%',fontSize:'13px',padding:'8px',borderRadius:'6px',
                      border:'1px solid #e2e8f0',resize:'vertical',fontFamily:'inherit',lineHeight:'1.6',color:'#444'}}
                  />
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <button type="button" onClick={() => päivitäPalvelu(p.id,'aktiivinen',!p.aktiivinen)}
                    style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',border:'none',cursor:'pointer',
                      background: p.aktiivinen ? '#E1F5EE' : '#F1F5F9',
                      color:      p.aktiivinen ? '#085041' : '#666'}}>
                    {p.aktiivinen ? '✓ Aktiivinen' : 'Ei aktiivinen'}
                  </button>
                  <button type="button" onClick={() => setMuokkausId(muokkausId === p.id ? null : p.id)}
                    style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',border:'none',cursor:'pointer',
                      background:'#E6F1FB',color:'#0C447C'}}>
                    ✏️ Muokkaa lomaketta
                  </button>
                  <button type="button" onClick={() => poistaPalvelu(p.id)}
                    style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',border:'none',cursor:'pointer',
                      background:'#FEE2E2',color:'#991B1B'}}>
                    Poista
                  </button>
                </div>

                {muokkausId === p.id && (
                  <div style={{marginTop:'4px',padding:'14px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #e2e8f0'}}>

                    {/* Vakio-osiot */}
                    <p style={{fontSize:'11px',fontWeight:'600',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.04em',margin:'0 0 8px'}}>Vakio-osiot</p>
                    {[
                      {id:'kontraindikaatiot', nimi:'Asiakastiedot'},
                      {id:'kontra_laaja',      nimi:'Esteet hoidolle'},
                      {id:'kiputilanne',       nimi:'Kiputilanne'},
                      {id:'keho_merkinnat',    nimi:'Kehon merkinnät'},
                      {id:'tietosuoja',        nimi:'Tietosuoja ja vahvistus'},
                      {id:'allekirjoitus',     nimi:'Allekirjoitus'},
                    ].map(osio => {
                      const muokataan = muokkausOsio?.pid === p.id && muokkausOsio?.osioId === osio.id
                      const näytettäväNimi = p.lomake?.osioNimet?.[osio.id] ?? osio.nimi
                      return (
                        <Fragment key={osio.id}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',
                          padding:'7px 10px',borderRadius:'6px',border:'1px solid',
                          background: !p.lomake?.piilotetutOsiot?.[osio.id] ? '#E1F5EE' : '#f9fafb',
                          borderColor: muokataan ? '#9FE1CB' : !p.lomake?.piilotetutOsiot?.[osio.id] ? '#9FE1CB' : '#e2e8f0',
                        }}>
                          <input type="checkbox"
                            checked={!p.lomake?.piilotetutOsiot?.[osio.id]}
                            onChange={() => {
                              const piilotetut = { ...p.lomake?.piilotetutOsiot, [osio.id]: !p.lomake?.piilotetutOsiot?.[osio.id] }
                              päivitäPalvelu(p.id, 'lomake', { ...p.lomake, piilotetutOsiot: piilotetut })
                            }}
                            style={{width:'14px',height:'14px',accentColor:'#1D9E75',flexShrink:0,cursor:'pointer'}}
                          />
                          {muokataan ? (
                            <input
                              autoFocus
                              value={muokkausOsio.nimi}
                              onChange={e => setMuokkausOsio(prev => ({...prev, nimi: e.target.value}))}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  tallennaMuokkausOsio(p.id, osio.id)
                                if (e.key === 'Escape') setMuokkausOsio(null)
                              }}
                              onBlur={() => tallennaMuokkausOsio(p.id, osio.id)}
                              style={{flex:1,fontSize:'13px',padding:'1px 4px',border:'none',outline:'none',background:'transparent',color:'#374151'}}
                            />
                          ) : (
                            <span
                              onClick={() => setMuokkausOsio({ pid: p.id, osioId: osio.id, nimi: näytettäväNimi })}
                              style={{flex:1,fontSize:'13px',color:'#374151',cursor:'text'}}
                              title="Klikkaa muokataksesi nimeä"
                            >
                              {näytettäväNimi}
                              {p.lomake?.osioNimet?.[osio.id] && (
                                <span style={{fontSize:'10px',color:'#9ca3af',marginLeft:'6px'}}>(muokattu)</span>
                              )}
                            </span>
                          )}
                          {(() => {
                            const onKontra = osio.id === 'kontra_laaja'
                            const btnLabel = onKontra ? 'Esteet' : 'Kuvaus'
                            const hasContent = !!p.lomake?.osioKuvaukset?.[osio.id]
                            const isOpen = muokkausOsioKuvaus?.pid === p.id && muokkausOsioKuvaus?.osioId === osio.id
                            return (
                              <button
                                type="button"
                                onClick={() => setMuokkausOsioKuvaus(isOpen ? null : {
                                  pid: p.id, osioId: osio.id,
                                  teksti: p.lomake?.osioKuvaukset?.[osio.id] ?? '',
                                })}
                                style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',border:'1px solid',cursor:'pointer',flexShrink:0,
                                  background: isOpen ? '#E6F1FB' : hasContent ? '#E1F5EE' : '#f1f5f9',
                                  borderColor: isOpen ? '#93c5fd' : hasContent ? '#9FE1CB' : '#e2e8f0',
                                  color: isOpen ? '#0C447C' : hasContent ? '#085041' : '#6b7280',
                                }}
                              >
                                {btnLabel}{hasContent ? ' ✓' : ' +'}
                              </button>
                            )
                          })()}
                        </div>

                        {/* Kuvauseditori / Esteeteditori */}
                        {muokkausOsioKuvaus?.pid === p.id && muokkausOsioKuvaus?.osioId === osio.id && (
                          <div style={{marginBottom:'6px',padding:'10px',background:'white',borderRadius:'6px',border:'1px solid #e2e8f0'}}>
                            {osio.id === 'kontra_laaja' ? (
                              <p style={{fontSize:'11px',color:'#6b7280',marginBottom:'6px'}}>
                                Kirjoita tähän kyseisen hoidon esteet. Asiakas lukee nämä lomakkeella ennen lähettämistä.
                              </p>
                            ) : (
                              <p style={{fontSize:'11px',color:'#6b7280',marginBottom:'6px'}}>
                                Teksti näkyy asiakkaalle osion otsikon alla lomakkeella.
                              </p>
                            )}
                            <textarea
                              value={muokkausOsioKuvaus.teksti}
                              onChange={e => setMuokkausOsioKuvaus(prev => ({...prev, teksti: e.target.value}))}
                              rows={osio.id === 'kontra_laaja' ? 6 : 4}
                              placeholder={osio.id === 'kontra_laaja'
                                ? 'Esim:\n– Raskaus\n– Sydämentahdistin\n– Veren ohennuslääkitys\n– Avoimet haavat tai infektiot\n– Akuutti tulehdus'
                                : 'Kirjoita ohjeistus tai kuvaus tälle osiolle…'}
                              style={{width:'100%',fontSize:'13px',padding:'8px',borderRadius:'6px',border:'1px solid #e2e8f0',
                                resize:'vertical',fontFamily:'inherit',lineHeight:'1.6',color:'#374151',boxSizing:'border-box'}}
                            />
                            <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                              <button type="button"
                                onClick={() => tallennaMuokkausOsioKuvaus(p.id, osio.id)}
                                style={{fontSize:'12px',padding:'5px 14px',background:'#1D9E75',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'500'}}>
                                Tallenna
                              </button>
                              {p.lomake?.osioKuvaukset?.[osio.id] && (
                                <button type="button"
                                  onClick={() => {
                                    const pk = palvelut.find(x => x.id === p.id)
                                    const osioKuvaukset = { ...pk.lomake?.osioKuvaukset }
                                    delete osioKuvaukset[osio.id]
                                    päivitäPalvelu(p.id, 'lomake', { ...pk.lomake, osioKuvaukset })
                                    setMuokkausOsioKuvaus(null)
                                  }}
                                  style={{fontSize:'12px',padding:'5px 14px',background:'transparent',color:'#9ca3af',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer'}}>
                                  {osio.id === 'kontra_laaja' ? 'Poista esteet' : 'Poista kuvaus'}
                                </button>
                              )}
                              <button type="button"
                                onClick={() => setMuokkausOsioKuvaus(null)}
                                style={{fontSize:'12px',padding:'5px 10px',background:'transparent',color:'#9ca3af',border:'none',cursor:'pointer'}}>
                                Peru
                              </button>
                            </div>
                          </div>
                        )}
                        </Fragment>
                      )
                    })}
                    <p style={{fontSize:'11px',color:'#9ca3af',margin:'2px 0 14px'}}>Perustiedot näkyy aina.</p>

                    {/* Lisäkysymykset */}
                    <p style={{fontSize:'11px',fontWeight:'600',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.04em',margin:'0 0 8px'}}>
                      Lisäkysymykset{(p.lomake?.lisaKysymykset ?? []).length > 0 && ` (${(p.lomake?.lisaKysymykset ?? []).length}/10)`}
                    </p>

                    {(p.lomake?.lisaKysymykset ?? []).length === 0 ? (
                      <p style={{fontSize:'12px',color:'#9ca3af',marginBottom:'10px'}}>Ei lisäkysymyksiä.</p>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'10px'}}>
                        {(p.lomake?.lisaKysymykset ?? []).map((k, i, arr) => (
                          <div key={k.id} style={{display:'flex',gap:'6px',alignItems:'center',background:'white',padding:'7px 10px',borderRadius:'6px',border: muokkausKysId === k.id ? '1px solid #9FE1CB' : '1px solid #e2e8f0'}}>
                            <div style={{display:'flex',flexDirection:'column',flexShrink:0}}>
                              <button type="button" disabled={i === 0}
                                onClick={() => {
                                  const qs = [...p.lomake.lisaKysymykset]
                                  ;[qs[i-1], qs[i]] = [qs[i], qs[i-1]]
                                  päivitäPalvelu(p.id,'lomake',{...p.lomake,lisaKysymykset:qs})
                                }}
                                style={{fontSize:'9px',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:'1px',color: i===0 ? '#d1d5db' : '#6b7280'}}>▲</button>
                              <button type="button" disabled={i === arr.length - 1}
                                onClick={() => {
                                  const qs = [...p.lomake.lisaKysymykset]
                                  ;[qs[i], qs[i+1]] = [qs[i+1], qs[i]]
                                  päivitäPalvelu(p.id,'lomake',{...p.lomake,lisaKysymykset:qs})
                                }}
                                style={{fontSize:'9px',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:'1px',color: i===arr.length-1 ? '#d1d5db' : '#6b7280'}}>▼</button>
                            </div>

                            <div style={{flex:1,minWidth:0}}>
                              {muokkausKysId === k.id ? (
                                <input
                                  autoFocus
                                  value={muokkausKysTeksti}
                                  onChange={e => setMuokkausKysTeksti(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') tallennaMuokkausKys(p.id, k.id)
                                    if (e.key === 'Escape') setMuokkausKysId(null)
                                  }}
                                  onBlur={() => tallennaMuokkausKys(p.id, k.id)}
                                  maxLength={120}
                                  style={{width:'100%',fontSize:'13px',padding:'2px 6px',border:'none',outline:'none',background:'transparent',color:'#374151'}}
                                />
                              ) : (
                                <p
                                  onClick={() => { setMuokkausKysId(k.id); setMuokkausKysTeksti(k.otsikko) }}
                                  style={{fontSize:'13px',color:'#374151',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'text'}}
                                  title="Klikkaa muokataksesi"
                                >{k.otsikko}</p>
                              )}
                              <p style={{fontSize:'11px',color:'#9ca3af',margin:0}}>{KYSYMYS_TYYPIT.find(t=>t.id===k.tyyppi)?.label ?? k.tyyppi}</p>
                            </div>

                            <button type="button"
                              onClick={() => {
                                const qs = p.lomake.lisaKysymykset.filter(q => q.id !== k.id)
                                päivitäPalvelu(p.id,'lomake',{...p.lomake,lisaKysymykset:qs})
                              }}
                              style={{fontSize:'11px',padding:'2px 8px',background:'#FEE2E2',color:'#991B1B',border:'none',borderRadius:'20px',cursor:'pointer',flexShrink:0}}>
                              Poista
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(p.lomake?.lisaKysymykset ?? []).length < 10 && (
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        <input
                          type="text"
                          value={uusiKys[p.id]?.teksti ?? ''}
                          onChange={e => setUusiKys(prev => ({...prev, [p.id]: {...(prev[p.id]??{}), teksti: e.target.value}}))}
                          onKeyDown={e => {
                            if (e.key !== 'Enter') return
                            const teksti = (uusiKys[p.id]?.teksti ?? '').trim()
                            if (!teksti) return
                            const qs = [...(p.lomake?.lisaKysymykset ?? []), {id:'k'+Date.now(), otsikko:teksti, tyyppi: uusiKys[p.id]?.tyyppi ?? 'teksti'}]
                            päivitäPalvelu(p.id,'lomake',{...p.lomake,lisaKysymykset:qs})
                            setUusiKys(prev => ({...prev, [p.id]: {teksti:'', tyyppi: prev[p.id]?.tyyppi ?? 'teksti'}}))
                          }}
                          placeholder="Kirjoita lisäkysymys..."
                          maxLength={120}
                          style={{width:'100%',fontSize:'13px',padding:'7px 10px',borderRadius:'6px',border:'1px solid #e2e8f0',boxSizing:'border-box'}}
                        />
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                          {KYSYMYS_TYYPIT.map(t => (
                            <button key={t.id} type="button"
                              onClick={() => setUusiKys(prev => ({...prev, [p.id]: {...(prev[p.id]??{}), tyyppi: t.id}}))}
                              style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',border:'1px solid',cursor:'pointer',
                                borderColor: (uusiKys[p.id]?.tyyppi ?? 'teksti') === t.id ? '#1D9E75' : '#e2e8f0',
                                background:  (uusiKys[p.id]?.tyyppi ?? 'teksti') === t.id ? '#E1F5EE' : 'white',
                                color:       (uusiKys[p.id]?.tyyppi ?? 'teksti') === t.id ? '#085041' : '#6b7280',
                              }}>
                              {t.label}
                            </button>
                          ))}
                          <button type="button"
                            onClick={() => {
                              const teksti = (uusiKys[p.id]?.teksti ?? '').trim()
                              if (!teksti) return
                              const qs = [...(p.lomake?.lisaKysymykset ?? []), {id:'k'+Date.now(), otsikko:teksti, tyyppi: uusiKys[p.id]?.tyyppi ?? 'teksti'}]
                              päivitäPalvelu(p.id,'lomake',{...p.lomake,lisaKysymykset:qs})
                              setUusiKys(prev => ({...prev, [p.id]: {teksti:'', tyyppi: prev[p.id]?.tyyppi ?? 'teksti'}}))
                            }}
                            style={{marginLeft:'auto',fontSize:'12px',padding:'5px 14px',background:'#1D9E75',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'500'}}>
                            + Lisää
                          </button>
                        </div>
                      </div>
                    )}

                    <button type="button" onClick={() => setMuokkausId(null)}
                      style={{marginTop:'12px',fontSize:'12px',color:'#9ca3af',background:'transparent',border:'none',cursor:'pointer'}}>
                      Sulje ↑
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={lisääPalvelu}
              style={{padding:'8px',fontSize:'13px',
                border:'1px dashed #CBD5E1',
                borderRadius:'8px',cursor:'pointer',
                background:'transparent',color:'#666'}}>
              + Lisää palvelu
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => tallennaPalvelut()}
                style={{ padding: '8px 20px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Tallenna palvelut
              </button>
              {tallennettuPalvelut && (
                <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>Tallennettu!</span>
              )}
            </div>

          </div>
        }
      />

      {/* ── Integraatiot (Käyttäjähallinta, viimeisenä) ─────────────────── */}
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

      {/* ── OHJELMAHALLINTA ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mb-2 mt-4">Ohjelmahallinta</p>
      </div>

      <AccordionOsio
        id="tuotehallinta" otsikko="Tuotehallinta" ikoni="📋"
        auki={aukiOsio === 'tuotehallinta'} onToggle={toggle}
        lapset={<ProductBoard hoitajaId={hoitajaId} hideHeader />}
      />

      {/* ── 6: Kehittäjätyökalut ─────────────────────────────────────────── */}
      <AccordionOsio
        id="devtools" otsikko="Kehittäjätyökalut" ikoni="🛠️"
        auki={aukiOsio === 'devtools'} onToggle={toggle}
        lapset={
          <div className="flex flex-col gap-4">

            {/* Tarkista ja siivoa koodi */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Claude Code -promptit</p>
              <button
                type="button"
                onClick={() => {
                  const prompt = `TÄRKEÄÄ: Push suoraan mainiin, ei PR:ää.

Tee kattava koodin tarkistus ja siivous Kehokorjaamo App -projektille:

1. TARKISTA kaikki komponentit:
   - Poistetut/turhat console.log rivit
   - Käyttämättömät importit
   - Duplikaattikoodi eri tiedostoissa
   - Rikkinäiset propsit tai puuttuvat prop-validoinnit

2. TARKISTA Supabase-kyselyt:
   - Oikeat sarakkeiden nimet
   - RLS-yhteensopivuus
   - Virheenkäsittely kaikissa kutsuissa

3. TARKISTA navigaatio ja tila:
   - Tilamuuttujat järkeviä
   - Ei muistivuotoja (cleanup useEffect)
   - Komponentit unmountataan oikein

4. SIIVOA:
   - Poista debug-koodit
   - Yhtenäistä tyylimäärittelyt
   - Korjaa varoitukset

5. RAPORTOI mitä löysit ja korjasit

6. EHDOTA parannuksia selkokielellä käyttäen tätä muotoa:

IDEAT_ALKAA
- Idea 1 lyhyesti
- Idea 2 lyhyesti
IDEAT_LOPPUU

Jos jokin tehtävä on valmis, ilmoita:
VALMIS: Tehtävän teksti tässä

7. Tee commit ja push mainiin`
                  navigator.clipboard.writeText(prompt)
                  alert('Prompt kopioitu! Liitä Claude Codeen.')
                }}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                📋 Tarkista ja siivoa koodi
              </button>
            </div>

            {/* Liitä Coden ehdotukset */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Liitä Coden ehdotukset</p>
              <textarea
                value={devInput}
                onChange={e => setDevInput(e.target.value)}
                placeholder="Liitä tähän Claude Coden vastaus..."
                rows={5}
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-y font-mono focus:outline-none focus:border-brand-400"
              />
              <button
                type="button"
                disabled={devTila === 'lähetetään'}
                onClick={async () => {
                  if (devTila === 'lähetetään') return

                  const teksti = devInput.trim()
                  if (!teksti) return
                  if (!hoitajaId) { alert('Kirjaudu sisään ensin.'); return }

                  setDevTila('lähetetään')

                  const { data: rows, error: lukuErr } = await supabase
                    .from('productboard')
                    .select('visio, ideat, todo, changelog')
                    .eq('hoitaja_id', hoitajaId)
                    .maybeSingle()

                  if (lukuErr) {
                    console.error('ProductBoard lukuvirhe:', lukuErr)
                    alert('Tietojen lataus epäonnistui.')
                    setDevTila(null)
                    return
                  }

                  const pb = rows ?? { visio: '', ideat: [], todo: [], changelog: [] }
                  const { uudet, valmistuvat, valmistuvienIdt, uudetCL } =
                    rakennaPbPäivitys(teksti, pb.todo ?? [])

                  const olemassa = new Set(
                    (pb.ideat ?? []).map(i => (i.teksti ?? '').toLowerCase().trim())
                  )
                  const ainutlaatuiset = uudet.filter(
                    u => !olemassa.has((u.teksti ?? '').toLowerCase().trim())
                  )
                  const ohitettuja = uudet.length - ainutlaatuiset.length

                  if (ainutlaatuiset.length === 0 && valmistuvat.length === 0) {
                    if (ohitettuja > 0) {
                      alert(`Kaikki ${ohitettuja} ideaa olivat jo listalla — ei lisätty.`)
                    } else {
                      alert('Ei ideoita tai VALMIS-merkintöjä löydetty.')
                    }
                    setDevTila(null)
                    return
                  }

                  const uusiPb = {
                    hoitaja_id: hoitajaId,
                    visio:     pb.visio ?? '',
                    ideat:     ainutlaatuiset.length > 0 ? [...(pb.ideat ?? []), ...ainutlaatuiset] : (pb.ideat ?? []),
                    todo:      valmistuvienIdt.size  > 0 ? (pb.todo ?? []).filter(t => !valmistuvienIdt.has(t.id)) : (pb.todo ?? []),
                    changelog: uudetCL.length        > 0 ? [...(pb.changelog ?? []), ...uudetCL]   : (pb.changelog ?? []),
                  }

                  const { error: tallErr } = await supabase
                    .from('productboard')
                    .upsert(uusiPb, { onConflict: 'hoitaja_id' })

                  if (tallErr) {
                    console.error('ProductBoard tallennus epäonnistui:', tallErr)
                    alert('Tallennus epäonnistui.')
                    setDevTila(null)
                    return
                  }

                  setDevInput('')
                  setDevTila('ok')
                  setTimeout(() => setDevTila(null), 2500)
                }}
                className="mt-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {devTila === 'lähetetään' ? '⏳ Tallennetaan...' :
                 devTila === 'ok'         ? '✅ Lisätty!' :
                                            '⬇️ Lisää tuotehallintaan'}
              </button>
            </div>

            {/* Aja testit (tuleva) */}
            <div>
              <button
                type="button"
                disabled
                className="px-4 py-2.5 border border-gray-200 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
              >
                Tulossa — automaattiset testit
              </button>
            </div>

            {/* Versiotiedot */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Versio</span>
                <span className="font-medium text-gray-800">V1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Viimeisin deploy</span>
                <span className="font-medium text-gray-800">{new Date().toLocaleDateString('fi-FI')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GitHub</span>
                <a
                  href="https://github.com/oxainn/kehokorjaamo-app"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-700 hover:underline"
                >
                  oxainn/kehokorjaamo-app
                </a>
              </div>
            </div>

          </div>
        }
      />

      {/* ── Kehonkartan kalibrointi ───────────────────────────────────────── */}
      <AccordionOsio
        id="kehonkartta-kalibrointi" otsikko="Kehonkartan kalibrointi" ikoni="🗺️"
        auki={aukiOsio === 'kehonkartta-kalibrointi'} onToggle={toggle}
        lapset={<KehonkarttaKalibrointi />}
      />

      {/* ── 5: Tiedot ja tallennus ───────────────────────────────────────── */}
      <AccordionOsio
        id="tallennus" otsikko="Tiedot ja tallennus" ikoni="💾"
        auki={aukiOsio === 'tallennus'} onToggle={toggle}
        lapset={
          <>
            {/* Versio-info */}
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Versio</span>
              <span className="text-sm font-medium text-gray-800">Kehokorjaamo App V1</span>
            </div>

            {/* Tallennustieto */}
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Tallennus</span>
              <span className="text-sm font-medium text-gray-700">Tiedot tallennettu tällä laitteella</span>
            </div>

            {/* Toimintanapit */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Haluatko varmasti tyhjentää kaikki asiakastiedot? Tätä ei voi peruuttaa.')) {
                    Object.keys(localStorage)
                      .filter(k => k.startsWith('kehokorjaamo_asiakas'))
                      .forEach(k => localStorage.removeItem(k))
                    alert('Asiakastiedot tyhjennetty.')
                  }
                }}
                className="px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors self-start"
              >
                Tyhjennä kaikki asiakastiedot
              </button>

              <button
                type="button"
                onClick={() => {
                  const kaikki = {}
                  Object.keys(localStorage).forEach(k => {
                    try { kaikki[k] = JSON.parse(localStorage.getItem(k)) }
                    catch { kaikki[k] = localStorage.getItem(k) }
                  })
                  const blob = new Blob([JSON.stringify(kaikki, null, 2)], { type: 'application/json' })
                  const url  = URL.createObjectURL(blob)
                  const a    = document.createElement('a')
                  a.href     = url
                  a.download = `kehokorjaamo-vientitiedot-${new Date().toISOString().slice(0,10)}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-lg transition-colors self-start"
              >
                Vie tiedot JSON-tiedostona
              </button>
            </div>

            {/* Tuleva: pilvipalvelu */}
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between mt-1">
              <div>
                <p className="text-sm font-medium text-gray-400">Pilvitallennus (Supabase)</p>
                <p className="text-xs text-gray-400 mt-0.5">Tiedot synkronoituvat kaikille laitteille</p>
              </div>
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">V2</span>
            </div>
          </>
        }
      />


    </div>
  )
}
