import { useState } from 'react'
import { KEHON_VYÖHYKKEET } from '../data/kehonVyohykkeet'

const NORMAALI_KONTRA = [
  'Allergia', 'Diabetes', 'Epilepsia', 'Migreeni',
  'Masennus', 'Reuma', 'Raskaus', 'Matala / korkea verenpaine',
  'Spondylolyysi / -listeesi', 'Astma / hengenahdistus',
  'Sydänsairauksia', 'Tekonivel', 'Osteoporoosi', 'Verenohennuslääkitys',
  'Kaulavaltimon ahtauma', 'Hermojuuriaukon ahtauma',
  'Kilpirauhasen sairauksia', 'Psyykkinen sairaus',
]

const EHDOTTOMAT_KONTRA = [
  'Verisuoniproteesi', 'Tarttuva (iho)tauti', 'Tulehdus / kuume',
  'Kasvain / syöpä', 'Tuore vamma', 'Vyöruusu',
]

const OIRETYYPIT = [
  { id: 1, nimi: 'Kipu',          vari: 'bg-red-500',    kehys: 'border-red-400'    },
  { id: 2, nimi: 'Lihasjännitys', vari: 'bg-orange-400', kehys: 'border-orange-400' },
  { id: 3, nimi: 'Puutuminen',    vari: 'bg-blue-500',   kehys: 'border-blue-400'   },
  { id: 4, nimi: 'Tunnottomuus',  vari: 'bg-gray-400',   kehys: 'border-gray-400'   },
]

const PIIRTOVÄRIT = { 1: '#ef4444', 2: '#f97316', 3: '#3b82f6', 4: '#9ca3af' }

const TYHJÄ = {
  etunimi:        '',
  sukunimi:       '',
  syntymaaika:    '',
  puhelin:        '',
  sahkoposti:     '',
  pituus:         '',
  paino:          '',
  hoitoon_syy:    '',
  kipuaste:       0,
  kontraindikaatiot: {},
  allergia_lisatieto:  '',
  tekonivel_lisatieto: '',
  raskaus_lisatieto:   '',
  lisatiedot:     '',
  merkinnät:      {},
}

function kipuVari(arvo) {
  if (arvo === 0) return { kehys: '#9ca3af', tausta: '#f9fafb', teksti: '#6b7280' }
  if (arvo <= 3)  return { kehys: '#16a34a', tausta: '#dcfce7', teksti: '#15803d' }
  if (arvo <= 6)  return { kehys: '#ea580c', tausta: '#ffedd5', teksti: '#c2410c' }
  return           { kehys: '#dc2626', tausta: '#fee2e2', teksti: '#b91c1c' }
}

function Kenttä({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function TextInput({ label, name, value, onChange, type = 'text', required = false, placeholder = '', error }) {
  return (
    <Kenttä label={label} required={required} error={error}>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-green-500'
        }`}
      />
    </Kenttä>
  )
}

function Osio({ otsikko, lapset }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-800 text-base mb-5">{otsikko}</h3>
      <div className="flex flex-col gap-4">{lapset}</div>
    </div>
  )
}

export default function Esitiedot() {
  const [data, setData]               = useState(TYHJÄ)
  const [lähetetty, setLähetetty]     = useState(false)
  const [yritettyLähettää, setYritettyLähettää] = useState(false)
  const [valittuPiirto, setValittuPiirto] = useState(1)

  const palvelut = (JSON.parse(localStorage.getItem('kehokorjaamo_asetukset') || '{}').palvelut) ?? [
    { id: 'p1', nimi: 'Kalevalainen jäsenkorjaus', aktiivinen: true },
  ]
  const aktiivinenPalvelut = palvelut.filter(p => p.aktiivinen)
  const [valittuPalvelu, setValittuPalvelu] = useState(aktiivinenPalvelut[0]?.id ?? '')
  const [lisaVastaukset, setLisaVastaukset] = useState({})
  const [kuvausAuki, setKuvausAuki] = useState(false)

  const valitunPalvelunLomake = aktiivinenPalvelut.find(p => p.id === valittuPalvelu)?.lomake
    ?? { piilotetutOsiot: {}, lisaKysymykset: [] }
  const piilotettu = (osioId) => valitunPalvelunLomake.piilotetutOsiot?.[osioId] ?? false

  const päivitä = (e) => {
    const { name, value } = e.target
    setData(prev => ({ ...prev, [name]: value }))
  }

  const toggleKontra = (nimi) => {
    setData(prev => ({
      ...prev,
      kontraindikaatiot: {
        ...prev.kontraindikaatiot,
        [nimi]: !prev.kontraindikaatiot[nimi],
      },
    }))
  }

  const toggleVyöhyke = (zoneId) => {
    setData(prev => {
      const merkinnät = { ...prev.merkinnät }
      if (merkinnät[zoneId] === valittuPiirto) {
        delete merkinnät[zoneId]
      } else {
        merkinnät[zoneId] = valittuPiirto
      }
      return { ...prev, merkinnät }
    })
  }

  const ehdotonValittu = EHDOTTOMAT_KONTRA.some(e => data.kontraindikaatiot[e])
  const voidaanLähettää = data.etunimi.trim() && data.sukunimi.trim() && !ehdotonValittu

  const lähetä = (e) => {
    e.preventDefault()
    setYritettyLähettää(true)
    if (!voidaanLähettää) return

    const avain = 'esitiedot_' + Date.now()
    const tallennettava = {
      _key:             avain,
      etunimi:          data.etunimi,
      sukunimi:         data.sukunimi,
      syntymaaika:      data.syntymaaika,
      puhelin:          data.puhelin,
      sahkoposti:       data.sahkoposti,
      pituus:           data.pituus,
      paino:            data.paino,
      hoitoon_syy:      data.hoitoon_syy,
      kipuaste:         data.kipuaste,
      kontraindikaatiot:   data.kontraindikaatiot,
      allergia_lisatieto:  data.allergia_lisatieto,
      tekonivel_lisatieto: data.tekonivel_lisatieto,
      raskaus_lisatieto:   data.raskaus_lisatieto,
      lisatiedot:          data.lisatiedot,
      merkinnät:           data.merkinnät,
      lisaVastaukset:      lisaVastaukset,
      palvelu:             valittuPalvelu,
      aikaleima:        new Date().toISOString(),
    }
    localStorage.setItem(avain, JSON.stringify(tallennettava))

    const asetukset = JSON.parse(localStorage.getItem('kehokorjaamo_asetukset') || '{}')
    const varausUrl = asetukset.integraatiot?.vello
      || asetukset.integraatiot?.calendly
      || asetukset.integraatiot?.omanettisivu
      || 'https://vello.fi/kalevalapaja'
    window.open(varausUrl, '_blank')

    setLähetetty(true)
  }

  const väri = kipuVari(data.kipuaste)

  if (lähetetty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Esitiedot lähetetty!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Kiitos, {data.etunimi}! Esitietosi on vastaanotettu. Otamme sinuun yhteyttä
            ajanvarauksen vahvistamiseksi.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Ylätunniste */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-2xl font-bold tracking-tight text-gray-900">Kalevalapaja</span>
            <h1 className="text-lg font-semibold text-green-700 mt-1">Esitietolomake</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Täytä tiedot ennen hoitokäyntiäsi
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={lähetä} className="flex flex-col gap-5">

          {/* ── Palvelunvalinta ──────────────────────────────────────────── */}
          {aktiivinenPalvelut.length > 1 && (
            <div style={{marginBottom:'16px'}}>
              <p style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px'}}>
                Valitse palvelu
              </p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                {aktiivinenPalvelut.map(p => (
                  <button key={p.id}
                    type="button"
                    onClick={() => { setValittuPalvelu(p.id); setLisaVastaukset({}) }}
                    style={{
                      padding:'8px 16px',
                      borderRadius:'20px',
                      border:'1px solid',
                      cursor:'pointer',
                      fontSize:'13px',
                      borderColor: valittuPalvelu === p.id ? '#1D9E75' : '#e2e8f0',
                      background:  valittuPalvelu === p.id ? '#E1F5EE' : 'white',
                      color:       valittuPalvelu === p.id ? '#085041' : '#666',
                    }}
                  >
                    {p.nimi}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Palvelun kuvaus ──────────────────────────────────────────── */}
          <div style={{textAlign:'center',marginBottom:'16px'}}>
            <button type="button"
              onClick={() => setKuvausAuki(!kuvausAuki)}
              style={{fontSize:'13px',padding:'6px 16px',borderRadius:'20px',
                border:'1px solid #e2e8f0',background:'transparent',cursor:'pointer',color:'#666'}}>
              {kuvausAuki ? '▲ Piilota kuvaus' : '▼ Palvelun kuvaus'}
            </button>
          </div>
          {kuvausAuki && (
            <div style={{marginBottom:'16px',padding:'12px 16px',background:'#F8FAFC',
              borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'13px',
              color:'#444',lineHeight:'1.6',whiteSpace:'pre-wrap'}}>
              {aktiivinenPalvelut.find(p => p.id === valittuPalvelu)?.kuvaus || 'Ei kuvausta tälle palvelulle.'}
            </div>
          )}

          {/* ── Osio 1: Asiakastiedot ─────────────────────────────────────── */}
          <Osio otsikko="Asiakastiedot" lapset={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Etunimi" name="etunimi"
                  value={data.etunimi} onChange={päivitä}
                  required placeholder="Matti"
                  error={yritettyLähettää && !data.etunimi.trim() ? 'Etunimi on pakollinen' : ''}
                />
                <TextInput
                  label="Sukunimi" name="sukunimi"
                  value={data.sukunimi} onChange={päivitä}
                  required placeholder="Meikäläinen"
                  error={yritettyLähettää && !data.sukunimi.trim() ? 'Sukunimi on pakollinen' : ''}
                />
              </div>
              <TextInput
                label="Syntymäaika" name="syntymaaika"
                value={data.syntymaaika} onChange={päivitä}
                type="date"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Puhelin" name="puhelin"
                  value={data.puhelin} onChange={päivitä}
                  type="tel" placeholder="+358 40 123 4567"
                />
                <TextInput
                  label="Sähköposti" name="sahkoposti"
                  value={data.sahkoposti} onChange={päivitä}
                  type="email" placeholder="matti@esimerkki.fi"
                />
              </div>
              <div style={{display:'flex',gap:'12px',marginBottom:'12px'}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'3px'}}>Pituus (cm)</label>
                  <input type="number" name="pituus" min="100" max="250"
                    value={data.pituus || ''} onChange={päivitä} placeholder="170"
                    style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #e2e8f0',fontSize:'13px'}}
                  />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'3px'}}>Paino (kg)</label>
                  <input type="number" name="paino" min="30" max="300"
                    value={data.paino || ''} onChange={päivitä} placeholder="70"
                    style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #e2e8f0',fontSize:'13px'}}
                  />
                </div>
              </div>
              <p style={{fontSize:'11px',color:'#999',marginBottom:'16px',fontStyle:'italic'}}>
                Pituus- ja painotietoja käytetään tilastointiin ja palvelun kehittämiseen.
              </p>
            </>
          } />

          {/* ── Osio 2: Hoitoon tulon syy ────────────────────────────────── */}
          <Osio otsikko="Hoitoon tulon syy" lapset={
            <>
              <Kenttä label="Mikä vaiva tai ongelma toi sinut hoitoon?">
                <textarea
                  name="hoitoon_syy"
                  value={data.hoitoon_syy}
                  onChange={päivitä}
                  rows={4}
                  placeholder="Kuvaile vaivasi omin sanoin — milloin alkoi, missä tuntuu, mikä helpottaa tai pahentaa..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </Kenttä>

              {!piilotettu('kiputilanne') && <Kenttä label={`Kipuasteikko (VAS) — tällä hetkellä ${data.kipuaste}/10`}>
                <div className="flex items-center gap-4 mt-1">
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 transition-colors"
                    style={{
                      backgroundColor: väri.tausta,
                      borderColor:     väri.kehys,
                      color:           väri.teksti,
                    }}
                  >
                    {data.kipuaste}
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0} max={10}
                      value={data.kipuaste}
                      onChange={e => setData(prev => ({ ...prev, kipuaste: Number(e.target.value) }))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: data.kipuaste === 0
                          ? '#e5e7eb'
                          : `linear-gradient(to right, ${väri.kehys} 0%, ${väri.kehys} ${data.kipuaste * 10}%, #e5e7eb ${data.kipuaste * 10}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Ei kipua</span>
                      <span>Pahin mahdollinen</span>
                    </div>
                  </div>
                </div>
              </Kenttä>}
            </>
          } />

          {/* ── Osio 3: Kehon merkinnät ──────────────────────────────────── */}
          {!piilotettu('keho_merkinnat') && <Osio otsikko="Kehon merkinnät" lapset={
            <>
              <p className="text-xs text-gray-500">
                Valitse oiretyyppi ja napauta kehokuvasta haluamasi kohta. Napauta uudelleen poistaaksesi merkinnän.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {OIRETYYPIT.map(tyyppi => {
                  const aktiivinen = valittuPiirto === tyyppi.id
                  return (
                    <button
                      key={tyyppi.id}
                      type="button"
                      onClick={() => setValittuPiirto(tyyppi.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                        aktiivinen ? `${tyyppi.kehys} bg-white shadow-sm` : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-full ${tyyppi.vari} text-white text-sm font-bold flex items-center justify-center`}>
                        {tyyppi.id}
                      </span>
                      <span className="text-xs font-medium text-gray-700">{tyyppi.nimi}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ position: 'relative', width: '100%', marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <img src="/hahmokuvat.svg" style={{ width: '100%', display: 'block' }} alt="Kehon merkintäalue" />
                <svg
                  viewBox="0 0 1471 1069"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', touchAction: 'manipulation' }}
                >
                  {KEHON_VYÖHYKKEET.map(z => {
                    const merkitty = data.merkinnät[z.id]
                    return (
                      <circle
                        key={z.id}
                        cx={z.cx} cy={z.cy} r={42}
                        fill={merkitty ? PIIRTOVÄRIT[merkitty] + 'cc' : 'transparent'}
                        stroke={merkitty ? PIIRTOVÄRIT[merkitty] : '#94a3b8'}
                        strokeWidth={merkitty ? 3 : 1.5}
                        strokeDasharray={merkitty ? 'none' : '6 4'}
                        onClick={() => toggleVyöhyke(z.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    )
                  })}
                </svg>
              </div>

              {Object.keys(data.merkinnät).length > 0 && (
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, merkinnät: {} }))}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors self-start"
                >
                  Tyhjennä kaikki merkinnät
                </button>
              )}
            </>
          } />}

          {/* ── Osio 4: Kontraindikaatiot ────────────────────────────────── */}
          {!piilotettu('kontraindikaatiot') && <Osio otsikko="Terveystiedot" lapset={
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Huomioitavat terveystiedot — rastita kaikki, jotka koskevat sinua
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mb-1">
                  <input
                    type="checkbox"
                    checked={!!data.kontraindikaatiot['Allergia']}
                    onChange={() => toggleKontra('Allergia')}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 flex-shrink-0">Allergia</span>
                  {!!data.kontraindikaatiot['Allergia'] && (
                    <input
                      type="text"
                      name="allergia_lisatieto"
                      value={data.allergia_lisatieto}
                      onChange={päivitä}
                      placeholder="esim. pähkinät, siitepöly, lääkeaine..."
                      style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mb-1">
                  <input
                    type="checkbox"
                    checked={!!data.kontraindikaatiot['Tekonivel']}
                    onChange={() => toggleKontra('Tekonivel')}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 flex-shrink-0">Tekonivel</span>
                  {!!data.kontraindikaatiot['Tekonivel'] && (
                    <input
                      type="text"
                      name="tekonivel_lisatieto"
                      value={data.tekonivel_lisatieto}
                      onChange={päivitä}
                      placeholder="esim. lonkka vasen, polvi oikea, olkapää..."
                      style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mb-1">
                  <input
                    type="checkbox"
                    checked={!!data.kontraindikaatiot['Raskaus']}
                    onChange={() => toggleKontra('Raskaus')}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 flex-shrink-0">Raskaus</span>
                  {!!data.kontraindikaatiot['Raskaus'] && (
                    <input
                      type="text"
                      name="raskaus_lisatieto"
                      value={data.raskaus_lisatieto}
                      onChange={päivitä}
                      placeholder="raskausviikot / lisätietoja"
                      style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {NORMAALI_KONTRA.filter(n => n !== 'Allergia' && n !== 'Tekonivel' && n !== 'Raskaus').map(nimi => (
                    <label key={nimi} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={!!data.kontraindikaatiot[nimi]}
                        onChange={() => toggleKontra(nimi)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{nimi}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">
                  Ehdottomat esteet *
                </p>
                <p className="text-xs text-red-400 mb-3">
                  Jos jokin näistä koskee sinua, hoito ei ole mahdollinen — ota ensin yhteyttä hoitajaan.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {EHDOTTOMAT_KONTRA.map(nimi => (
                    <label key={nimi} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={!!data.kontraindikaatiot[nimi]}
                        onChange={() => toggleKontra(nimi)}
                        className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-red-700 font-medium">{nimi}</span>
                    </label>
                  ))}
                </div>
              </div>

              {ehdotonValittu && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700">
                    Hoito ei ole mahdollinen — ota yhteyttä hoitajaan ennen ajanvarausta.
                  </p>
                </div>
              )}
            </>
          } />}

          {/* ── Osio 5: Lisätiedot ───────────────────────────────────────── */}
          <Osio otsikko="Lisätiedot" lapset={
            <Kenttä label="Muuta huomioitavaa">
              <textarea
                name="lisatiedot"
                value={data.lisatiedot}
                onChange={päivitä}
                rows={3}
                placeholder="Lääkitys, allergiat, aiemmat hoidot tai muu hoitajalle tärkeä tieto..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </Kenttä>
          } />

          {/* ── Lisäkysymykset ───────────────────────────────────────────── */}
          {valitunPalvelunLomake.lisaKysymykset.length > 0 && (
            <Osio otsikko="Lisäkysymykset" lapset={
              <>
                {valitunPalvelunLomake.lisaKysymykset.map(k => (
                  <div key={k.id} style={{marginBottom:'12px'}}>
                    <label style={{fontSize:'13px',fontWeight:'500',display:'block',marginBottom:'4px'}}>
                      {k.otsikko}
                    </label>
                    {k.tyyppi === 'kylla_ei' ? (
                      <div style={{display:'flex',gap:'12px'}}>
                        <label><input type="radio" name={k.id} value="kylla" onChange={e => setLisaVastaukset(prev => ({...prev, [k.id]: e.target.value}))}/> Kyllä</label>
                        <label><input type="radio" name={k.id} value="ei"    onChange={e => setLisaVastaukset(prev => ({...prev, [k.id]: e.target.value}))}/> Ei</label>
                      </div>
                    ) : k.tyyppi === 'numero' ? (
                      <input type="number"
                        onChange={e => setLisaVastaukset(prev => ({...prev, [k.id]: e.target.value}))}
                        style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #e2e8f0'}}
                      />
                    ) : (
                      <textarea rows={2}
                        onChange={e => setLisaVastaukset(prev => ({...prev, [k.id]: e.target.value}))}
                        style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #e2e8f0',fontSize:'13px'}}
                      />
                    )}
                  </div>
                ))}
              </>
            } />
          )}

          {/* ── Lähetä-nappi ─────────────────────────────────────────────── */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-semibold text-base transition-colors shadow-sm"
            style={{
              background: '#1D9E75',
              color:      '#fff',
              cursor:     'pointer',
            }}
          >
            {ehdotonValittu
              ? 'Hoito ei ole mahdollinen — ota yhteyttä'
              : 'Lähetä esitiedot ja varaa aika →'
            }
          </button>

        </form>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        Tietoja käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti.
      </footer>
    </div>
  )
}
