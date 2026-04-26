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

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const LOMAKE_MUUTTUVAT_OSIOT = [
  { id: 'terveystiedot',   label: 'Terveystiedot',   kuvaus: 'Kontraindikaatiot, sairaudet, lääkitys' },
  { id: 'kehon_merkinnat', label: 'Kehon merkinnät',  kuvaus: 'Kehokuva anatomisilla vyöhykkeillä' },
]

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

  // ── Palvelut ──────────────────────────────────────────────────────────────
  const [palvelut, setPalvelut] = useState(() => {
    const tallennettu = lueAsetukset().palvelut
    if (!tallennettu) return OLETUS_PALVELUT
    return tallennettu.map(p => ({ ...p, lomake: p.lomake ?? { ...TYHJÄ_PALVELU_LOMAKE } }))
  })
  const [muokkausId, setMuokkausId] = useState(null)

  const lisääPalvelu = () => {
    const uusi = { id: 'p' + Date.now(), nimi: 'Uusi palvelu', kuvaus: '', aktiivinen: true, lomake: { ...TYHJÄ_PALVELU_LOMAKE } }
    const päivitetty = [...palvelut, uusi]
    setPalvelut(päivitetty)
    tallennnaOsa('palvelut', päivitetty)
  }

  const poistaPalvelu = (id) => {
    const päivitetty = palvelut.filter(p => p.id !== id)
    setPalvelut(päivitetty)
    tallennnaOsa('palvelut', päivitetty)
  }

  const päivitäPalvelu = (id, kenttä, arvo) => {
    const päivitetty = palvelut.map(p => p.id === id ? { ...p, [kenttä]: arvo } : p)
    setPalvelut(päivitetty)
    tallennnaOsa('palvelut', päivitetty)
  }

  // ── Lomakerakentaja ───────────────────────────────────────────────────────
  const [lomake, setLomake] = useState(() => {
    const s = lueAsetukset().lomake ?? {}
    return {
      piilotetutOsiot: s.piilotetutOsiot ?? {},
      lisaKysymykset:  s.lisaKysymykset  ?? [],
    }
  })
  const [uusiKysymys, setUusiKysymys]           = useState('')
  const [uusiTyyppi, setUusiTyyppi]             = useState('teksti')
  const [tallennettuLomake, setTallennettuLomake] = useState(false)

  const tallennalomake = () => {
    tallennnaOsa('lomake', lomake)
    setTallennettuLomake(true)
    setTimeout(() => setTallennettuLomake(false), 2000)
  }

  const toggleOsio = (osioId) =>
    setLomake(prev => ({
      ...prev,
      piilotetutOsiot: { ...prev.piilotetutOsiot, [osioId]: !prev.piilotetutOsiot[osioId] },
    }))

  const lisääKysymys = () => {
    if (!uusiKysymys.trim() || lomake.lisaKysymykset.length >= 10) return
    setLomake(prev => ({
      ...prev,
      lisaKysymykset: [
        ...prev.lisaKysymykset,
        { id: uid(), otsikko: uusiKysymys.trim(), tyyppi: uusiTyyppi, pakollinen: false },
      ],
    }))
    setUusiKysymys('')
  }

  const poistaKysymys = (id) =>
    setLomake(prev => ({ ...prev, lisaKysymykset: prev.lisaKysymykset.filter(k => k.id !== id) }))

  const siirräYlös = (i) => setLomake(prev => {
    if (i === 0) return prev
    const k = [...prev.lisaKysymykset];[k[i - 1], k[i]] = [k[i], k[i - 1]]
    return { ...prev, lisaKysymykset: k }
  })

  const siirräAlas = (i) => setLomake(prev => {
    if (i >= prev.lisaKysymykset.length - 1) return prev
    const k = [...prev.lisaKysymykset];[k[i], k[i + 1]] = [k[i + 1], k[i]]
    return { ...prev, lisaKysymykset: k }
  })

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

      {/* ── 4: Palvelut ──────────────────────────────────────────────────── */}
      <AccordionOsio
        id="palvelut" otsikko="Palvelut" ikoni="🏥"
        auki={aukiOsio === 'palvelut'} onToggle={toggle}
        lapset={
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

            {palvelut.map(p => (
              <div key={p.id} style={{
                border:'1px solid #e2e8f0',
                borderRadius:'8px',
                padding:'12px'
              }}>
                <input
                  value={p.nimi}
                  onChange={e => päivitäPalvelu(p.id,'nimi',e.target.value)}
                  style={{width:'100%',fontWeight:'500',
                    fontSize:'14px',border:'none',
                    borderBottom:'1px solid #e2e8f0',
                    paddingBottom:'4px',marginBottom:'8px'}}
                />
                <textarea
                  value={p.kuvaus}
                  placeholder="Kirjoita palvelun kuvaus..."
                  onChange={e => päivitäPalvelu(p.id,'kuvaus',e.target.value)}
                  rows={4}
                  style={{width:'100%',fontSize:'13px',color:'#444',
                    border:'1px solid #e2e8f0',borderRadius:'6px',padding:'8px',
                    resize:'vertical',fontFamily:'inherit',lineHeight:'1.6'}}
                />
                <div style={{display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap'}}>
                  <button type="button" onClick={() => päivitäPalvelu(p.id,'aktiivinen',!p.aktiivinen)}
                    style={{fontSize:'12px',padding:'3px 8px',
                      borderRadius:'20px',border:'none',cursor:'pointer',
                      background: p.aktiivinen ? '#E1F5EE' : '#F1F5F9',
                      color: p.aktiivinen ? '#085041' : '#666'}}>
                    {p.aktiivinen ? '✓ Aktiivinen' : 'Ei aktiivinen'}
                  </button>
                  <button type="button"
                    onClick={() => setMuokkausId(prev => prev === p.id ? null : p.id)}
                    style={{fontSize:'12px',padding:'3px 8px',borderRadius:'20px',border:'none',cursor:'pointer',
                      background: muokkausId === p.id ? '#dbeafe' : '#F1F5F9',
                      color:      muokkausId === p.id ? '#1d4ed8' : '#444'}}>
                    Muokkaa lomaketta
                  </button>
                  <button type="button" onClick={() => poistaPalvelu(p.id)}
                    style={{fontSize:'12px',padding:'3px 8px',
                      borderRadius:'20px',border:'none',cursor:'pointer',
                      background:'#FEE2E2',color:'#991B1B'}}>
                    Poista
                  </button>
                </div>

                {muokkausId === p.id && (
                  <div style={{marginTop:'12px',padding:'12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                    <p style={{fontSize:'13px',fontWeight:'500',marginBottom:'12px'}}>Lomakkeen osiot</p>

                    {[
                      {id:'kontraindikaatiot', nimi:'Terveystiedot ja kontraindikaatiot'},
                      {id:'kiputilanne',       nimi:'Kiputilanne'},
                      {id:'keho_merkinnat',    nimi:'Kehon merkinnät'},
                    ].map(osio => (
                      <div key={osio.id} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                        <input type="checkbox"
                          checked={!p.lomake?.piilotetutOsiot?.[osio.id]}
                          onChange={() => {
                            const piilotetut = { ...p.lomake?.piilotetutOsiot, [osio.id]: !p.lomake?.piilotetutOsiot?.[osio.id] }
                            päivitäPalvelu(p.id, 'lomake', { ...p.lomake, piilotetutOsiot: piilotetut })
                          }}
                        />
                        <label style={{fontSize:'13px'}}>{osio.nimi}</label>
                      </div>
                    ))}

                    <p style={{fontSize:'13px',fontWeight:'500',margin:'12px 0 8px'}}>Lisäkysymykset</p>

                    {(p.lomake?.lisaKysymykset ?? []).map((k, i) => (
                      <div key={k.id} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'6px'}}>
                        <span style={{fontSize:'13px',flex:1}}>{k.otsikko}</span>
                        <button type="button" onClick={() => {
                          const kysymykset = p.lomake.lisaKysymykset.filter(q => q.id !== k.id)
                          päivitäPalvelu(p.id, 'lomake', { ...p.lomake, lisaKysymykset: kysymykset })
                        }} style={{fontSize:'11px',padding:'2px 8px',background:'#FEE2E2',color:'#991B1B',border:'none',borderRadius:'20px',cursor:'pointer'}}>
                          Poista
                        </button>
                      </div>
                    ))}

                    <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                      <input
                        placeholder="Uusi kysymys..."
                        id={`uusi-${p.id}`}
                        style={{flex:1,fontSize:'13px',padding:'6px 8px',borderRadius:'6px',border:'1px solid #e2e8f0'}}
                      />
                      <select id={`tyyppi-${p.id}`}
                        style={{fontSize:'13px',padding:'6px',borderRadius:'6px',border:'1px solid #e2e8f0'}}>
                        <option value="teksti">Teksti</option>
                        <option value="kylla_ei">Kyllä/Ei</option>
                        <option value="numero">Numero</option>
                      </select>
                      <button type="button" onClick={() => {
                        const input  = document.getElementById(`uusi-${p.id}`)
                        const tyyppi = document.getElementById(`tyyppi-${p.id}`)
                        if (!input.value.trim()) return
                        const kysymykset = [...(p.lomake?.lisaKysymykset ?? []), { id: 'k' + Date.now(), otsikko: input.value.trim(), tyyppi: tyyppi.value }]
                        päivitäPalvelu(p.id, 'lomake', { ...p.lomake, lisaKysymykset: kysymykset })
                        input.value = ''
                      }} style={{fontSize:'13px',padding:'6px 12px',background:'#1D9E75',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>
                        + Lisää
                      </button>
                    </div>

                    <button type="button" onClick={() => setMuokkausId(null)}
                      style={{marginTop:'12px',fontSize:'12px',color:'#666',background:'transparent',border:'none',cursor:'pointer'}}>
                      Sulje ↑
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={lisääPalvelu}
              style={{padding:'8px',fontSize:'13px',
                border:'1px dashed #CBD5E1',
                borderRadius:'8px',cursor:'pointer',
                background:'transparent',color:'#666'}}>
              + Lisää palvelu
            </button>

          </div>
        }
      />

      {/* ── 5: Lomakerakentaja ──────────────────────────────────────────── */}
      <AccordionOsio
        id="lomakerakentaja" otsikko="Lomakerakentaja" ikoni="📋"
        auki={aukiOsio === 'lomakerakentaja'} onToggle={toggle}
        lapset={
          <div className="flex flex-col gap-5">

            {/* Vakio-osioiden näkyvyys */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vakio-osiot</p>
              <div className="flex flex-col gap-2">
                {LOMAKE_MUUTTUVAT_OSIOT.map(osio => (
                  <label
                    key={osio.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                      !lomake.piilotetutOsiot[osio.id]
                        ? 'bg-brand-50 border-brand-100'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!lomake.piilotetutOsiot[osio.id]}
                      onChange={() => toggleOsio(osio.id)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 flex-shrink-0"
                    />
                    <div>
                      <div className={`text-sm font-medium ${!lomake.piilotetutOsiot[osio.id] ? 'text-gray-800' : 'text-gray-400'}`}>
                        {osio.label}
                      </div>
                      <div className="text-xs text-gray-400">{osio.kuvaus}</div>
                    </div>
                  </label>
                ))}
                <p className="text-xs text-gray-400 mt-1">
                  Perustiedot, kiputilanne ja tietosuoja näkyvät aina.
                </p>
              </div>
            </div>

            {/* Lisäkysymykset */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Omat lisäkysymykset
                {lomake.lisaKysymykset.length > 0 && (
                  <span className="ml-2 text-brand-600 font-semibold">{lomake.lisaKysymykset.length}/10</span>
                )}
              </p>

              {lomake.lisaKysymykset.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Ei lisäkysymyksiä. Lisää alla.</p>
              ) : (
                <ul className="flex flex-col gap-2 mb-4">
                  {lomake.lisaKysymykset.map((k, i) => (
                    <li key={k.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex flex-col flex-shrink-0">
                        <button type="button" onClick={() => siirräYlös(i)} disabled={i === 0}
                          className="w-5 h-4 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none flex items-center justify-center"
                        >▲</button>
                        <button type="button" onClick={() => siirräAlas(i)} disabled={i === lomake.lisaKysymykset.length - 1}
                          className="w-5 h-4 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none flex items-center justify-center"
                        >▼</button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{k.otsikko}</p>
                        <p className="text-xs text-gray-400">
                          {KYSYMYS_TYYPIT.find(t => t.id === k.tyyppi)?.label ?? k.tyyppi}
                        </p>
                      </div>
                      <button type="button" onClick={() => poistaKysymys(k.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >Poista</button>
                    </li>
                  ))}
                </ul>
              )}

              {lomake.lisaKysymykset.length < 10 && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={uusiKysymys}
                    onChange={e => setUusiKysymys(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lisääKysymys()}
                    placeholder="Kirjoita kysymys..."
                    maxLength={120}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {KYSYMYS_TYYPIT.map(t => (
                      <button key={t.id} type="button" onClick={() => setUusiTyyppi(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${
                          uusiTyyppi === t.id
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300'
                        }`}
                      >{t.label}</button>
                    ))}
                    <button type="button" onClick={lisääKysymys}
                      className="ml-auto px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >+ Lisää</button>
                  </div>
                </div>
              )}
            </div>

            {/* Tallenna */}
            <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={tallennalomake}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                Tallenna
              </button>
              {tallennettuLomake && (
                <span className="text-sm text-green-600 font-medium">Tallennettu!</span>
              )}
            </div>
          </div>
        }
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
                      .filter(k => k.startsWith('kehokorjaamo_asiakas') || k.startsWith('esitiedot_'))
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
