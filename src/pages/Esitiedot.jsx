import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import AllekirjoitusPad from '../components/AllekirjoitusPad'

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
  nimi:             '',
  syntymaaika:      '',
  lahiosoite:       '',
  postinumero:      '',
  postitoimipaikka: '',
  sahkoposti:       '',
  puhelin:          '',
  pituus:           '',
  paino:            '',
  ammatti:          '',
  harrastukset:     '',
  hoitoon_syy:      '',
  laakitys:         '',
  miten_loysi:      '',
  kipuaste:         0,
  kontraindikaatiot:   {},
  kontra_laaja:        '',
  allergia_lisatieto:  '',
  tekonivel_lisatieto: '',
  raskaus_lisatieto:   '',
  lisatiedot:       '',
  merkinnät:        [],
  allekirjoitus:    '',
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

function Osio({ otsikko, kuvaus, lapset }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-800 text-base mb-5">{otsikko}</h3>
      {kuvaus && (
        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '16px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #9FE1CB' }}>
          {kuvaus}
        </p>
      )}
      <div className="flex flex-col gap-4">{lapset}</div>
    </div>
  )
}

export default function Esitiedot() {
  const [data, setData]               = useState(TYHJÄ)
  const [lähetetty, setLähetetty]     = useState(false)
  const [lataa, setLataa]             = useState(false)
  const [yritettyLähettää, setYritettyLähettää] = useState(false)
  const [valittuPiirto, setValittuPiirto] = useState(1)

  const [searchParams] = useSearchParams()
  const palvelut = (JSON.parse(localStorage.getItem('kehokorjaamo_asetukset') || '{}').palvelut) ?? [
    { id: 'p1', nimi: 'Kalevalainen jäsenkorjaus', aktiivinen: true },
  ]
  const aktiivinenPalvelut = palvelut.filter(p => p.aktiivinen)
  const urlPalvelu = searchParams.get('palvelu')
  const [valittuPalvelu, setValittuPalvelu] = useState(() => {
    if (urlPalvelu && aktiivinenPalvelut.some(p => p.id === urlPalvelu)) return urlPalvelu
    return aktiivinenPalvelut[0]?.id ?? ''
  })
  const [lisaVastaukset, setLisaVastaukset] = useState({})
  const [kuvausAuki, setKuvausAuki] = useState(false)
  const [tietosuoja1, setTietosuoja1] = useState(false)
  const [tietosuoja2, setTietosuoja2] = useState(false)
  const [allekirjoitusKuva, setAllekirjoitusKuva] = useState('')

  const valitunPalvelunLomake = aktiivinenPalvelut.find(p => p.id === valittuPalvelu)?.lomake
    ?? { piilotetutOsiot: {}, lisaKysymykset: [] }
  const piilotettu  = (osioId)          => valitunPalvelunLomake.piilotetutOsiot?.[osioId] ?? false
  const osioNimi    = (osioId, oletus)  => valitunPalvelunLomake.osioNimet?.[osioId] ?? oletus
  const osioKuvaus  = (osioId)          => valitunPalvelunLomake.osioKuvaukset?.[osioId] || undefined

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

  const lisääMerkintä = (e) => {
    e.preventDefault()
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    setData(prev => {
      const lähellä = prev.merkinnät.findIndex(m => Math.hypot(m.x - x, m.y - y) < 4)
      if (lähellä >= 0) return { ...prev, merkinnät: prev.merkinnät.filter((_, i) => i !== lähellä) }
      return { ...prev, merkinnät: [...prev.merkinnät, { x, y, tyyppi: valittuPiirto }] }
    })
  }

  const ehdotonValittu = EHDOTTOMAT_KONTRA.some(e => data.kontraindikaatiot[e])
  const voidaanLähettää = data.nimi.trim() && !ehdotonValittu
    && (piilotettu('tietosuoja')    || tietosuoja1)
    && (piilotettu('allekirjoitus') || allekirjoitusKuva)

  const lähetä = async (e) => {
    e.preventDefault()
    setYritettyLähettää(true)
    if (!voidaanLähettää) return
    setLataa(true)

    try {
      console.log('Lähetetään esitiedot:', {
        nimi: data.nimi,
        sahkoposti: data.sahkoposti,
      })
      const { data: tallennettu, error } = await supabase
        .from('esitiedot')
        .insert({
          nimi:              data.nimi,
          syntymaaika:       data.syntymaaika || null,
          sahkoposti:        data.sahkoposti,
          puhelin:           data.puhelin,
          hoitoon_syy:       data.hoitoon_syy,
          kipu:              data.kipuaste || 0,
          kontraindikaatiot: data.kontraindikaatiot,
          merkinnät:         data.merkinnät,
          palvelu:           valittuPalvelu,
          lisatiedot:        data.lisatiedot,
        })
        .select()

      if (error) throw error
      console.log('Esitiedot tallennettu:', tallennettu)
    } catch (err) {
      console.error('Virhe:', err)
      alert('Virhe: ' + err?.message)
    }

    const avain = 'esitiedot_' + Date.now()
    localStorage.setItem(avain, JSON.stringify({ ...data, _key: avain }))

    setLataa(false)
    setLähetetty(true)

    const asetukset = JSON.parse(localStorage.getItem('kehokorjaamo_asetukset') || '{}')
    const varausUrl = asetukset.integraatiot?.vello
      || asetukset.integraatiot?.calendly
      || asetukset.integraatiot?.omanettisivu
      || 'https://vello.fi/kalevalapaja'
    window.open(varausUrl, '_blank')
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
            Kiitos, {data.nimi.split(' ')[0]}! Esitietosi on vastaanotettu. Otamme sinuun yhteyttä
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
          <Osio otsikko={osioNimi('kontraindikaatiot', 'Asiakastiedot')} kuvaus={osioKuvaus('kontraindikaatiot')} lapset={
            <>
              <TextInput
                label="Nimi" name="nimi"
                value={data.nimi} onChange={päivitä}
                required placeholder="Matti Meikäläinen"
                error={yritettyLähettää && !data.nimi.trim() ? 'Nimi on pakollinen' : ''}
              />
              <TextInput label="Syntymäaika" name="syntymaaika" value={data.syntymaaika} onChange={päivitä} type="date" />
              <TextInput label="Lähiosoite" name="lahiosoite" value={data.lahiosoite} onChange={päivitä} placeholder="Esimerkkikatu 1 A 2" />
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Postinumero" name="postinumero" value={data.postinumero} onChange={päivitä} placeholder="00100" />
                <TextInput label="Postitoimipaikka" name="postitoimipaikka" value={data.postitoimipaikka} onChange={päivitä} placeholder="Helsinki" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="Sähköposti" name="sahkoposti" value={data.sahkoposti} onChange={päivitä} type="email" placeholder="matti@esimerkki.fi" />
                <TextInput label="Puhelin" name="puhelin" value={data.puhelin} onChange={päivitä} type="tel" placeholder="+358 40 123 4567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Pituus (cm)" name="pituus" value={data.pituus} onChange={päivitä} type="number" placeholder="170" />
                <TextInput label="Paino (kg)"  name="paino"  value={data.paino}  onChange={päivitä} type="number" placeholder="70"  />
              </div>
              <p className="text-xs text-gray-400 italic -mt-2">
                Pituus- ja painotietoja käytetään tilastointiin ja palvelun kehittämiseen.
              </p>
              <TextInput label="Työ / ammatti" name="ammatti" value={data.ammatti} onChange={päivitä} />
              <Kenttä label="Harrastuksia">
                <textarea
                  name="harrastukset"
                  value={data.harrastukset}
                  onChange={päivitä}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </Kenttä>
              <Kenttä label="Hoitoon tulon syy">
                <textarea
                  name="hoitoon_syy"
                  value={data.hoitoon_syy}
                  onChange={päivitä}
                  rows={4}
                  placeholder="Kuvaile vaivasi omin sanoin — milloin alkoi, missä tuntuu, mikä helpottaa tai pahentaa..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </Kenttä>
              <Kenttä label="Säännöllinen lääkitys">
                <textarea
                  name="laakitys"
                  value={data.laakitys}
                  onChange={päivitä}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </Kenttä>
              <TextInput label="Miten löysit meidät" name="miten_loysi" value={data.miten_loysi} onChange={päivitä} />
            </>
          } />

          {/* ── Osio 1b: Kontraindikaatiot (vapaa teksti) ───────────────── */}
          {!piilotettu('kontra_laaja') && (() => {
            const esteetTeksti = osioKuvaus('kontra_laaja')
            return (
              <Osio otsikko={osioNimi('kontra_laaja', 'Esteet hoidolle')} lapset={
                <>
                  {esteetTeksti && (
                    <div style={{
                      background:'#FFF7ED', border:'1px solid #FED7AA',
                      borderRadius:'8px', padding:'12px 14px',
                    }}>
                      <p style={{fontSize:'12px',fontWeight:'600',color:'#92400E',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.03em'}}>
                        Hoidon esteet — lue ennen lomakkeen lähettämistä
                      </p>
                      <p style={{fontSize:'13px',color:'#78350F',whiteSpace:'pre-wrap',margin:0,lineHeight:'1.8'}}>
                        {esteetTeksti}
                      </p>
                    </div>
                  )}
                  <Kenttä label={esteetTeksti ? 'Onko sinulla jokin edellä mainituista? Kirjoita lisätiedot hoitajalle (valinnainen)' : 'Sairaudet, lääkitykset ja muut huomioitavat asiat'}>
                    <textarea
                      name="kontra_laaja"
                      value={data.kontra_laaja}
                      onChange={päivitä}
                      rows={esteetTeksti ? 3 : 5}
                      placeholder={esteetTeksti
                        ? 'Kerro tarkemmin jos jokin edellä mainituista koskee sinua…'
                        : 'Kerro tähän kaikki terveydentilaasi liittyvät asiat, jotka hoitajan tulisi tietää ennen hoitoa…'}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                    />
                  </Kenttä>
                </>
              } />
            )
          })()}

          {/* ── Osio 2: Kiputilanne ──────────────────────────────────────── */}
          {!piilotettu('kiputilanne') && <Osio otsikko={osioNimi('kiputilanne', 'Kiputilanne')} kuvaus={osioKuvaus('kiputilanne')} lapset={
            <Kenttä label={`Kipuasteikko (VAS) — tällä hetkellä ${data.kipuaste}/10`}>
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
            </Kenttä>
          } />}

          {/* ── Osio 3: Kehon merkinnät ──────────────────────────────────── */}
          {!piilotettu('keho_merkinnat') && <Osio otsikko={osioNimi('keho_merkinnat', 'Kehon merkinnät')} kuvaus={osioKuvaus('keho_merkinnat')} lapset={
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
                <img src="/hahmokuvat.svg" style={{ width: '100%', display: 'block', userSelect: 'none' }} alt="Kehon merkintäalue" />
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'manipulation' }}
                  onMouseDown={lisääMerkintä}
                  onTouchStart={lisääMerkintä}
                >
                  {data.merkinnät.map((m, i) => (
                    <circle
                      key={i}
                      cx={m.x} cy={m.y} r={2.2}
                      fill={PIIRTOVÄRIT[m.tyyppi]}
                      stroke="white"
                      strokeWidth={0.5}
                    />
                  ))}
                </svg>
              </div>

              {data.merkinnät.length > 0 && (
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, merkinnät: [] }))}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors self-start"
                >
                  Tyhjennä kaikki merkinnät
                </button>
              )}
            </>
          } />}

          {/* ── Osio 4: Kontraindikaatiot ────────────────────────────────── */}
          {!piilotettu('kontraindikaatiot') && <Osio otsikko={osioNimi('kontraindikaatiot', 'Terveystiedot')} kuvaus={osioKuvaus('kontraindikaatiot')} lapset={
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

          {/* ── Tietosuoja ja vahvistus ──────────────────────────────────── */}
          {(!piilotettu('tietosuoja') || !piilotettu('allekirjoitus')) && (
            <Osio otsikko={osioNimi('tietosuoja', 'Tietosuoja ja vahvistus')} kuvaus={osioKuvaus('tietosuoja')} lapset={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {!piilotettu('tietosuoja') && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tietosuoja1}
                        onChange={e => setTietosuoja1(e.target.checked)}
                        style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#1D9E75', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                        <strong>*</strong> Hyväksyn, että henkilö- ja terveystietojani tallennetaan hoitorekisteriin EU:n
                        tietosuoja-asetuksen (GDPR) mukaisesti hoitosuhteen ylläpitämistä varten.
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tietosuoja2}
                        onChange={e => setTietosuoja2(e.target.checked)}
                        style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#1D9E75', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                        Annan luvan tietojeni luovuttamiseen hoitooni osallistuville tahoille tarvittaessa.
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}> (valinnainen)</span>
                      </span>
                    </label>
                    {yritettyLähettää && !tietosuoja1 && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '-6px' }}>Hyväksy tietosuojaehto jatkaaksesi</p>
                    )}
                  </>
                )}

                {!piilotettu('allekirjoitus') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      Allekirjoitus <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <AllekirjoitusPad
                      onChange={setAllekirjoitusKuva}
                      error={yritettyLähettää && !allekirjoitusKuva}
                    />
                    {yritettyLähettää && !allekirjoitusKuva && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Allekirjoitus on pakollinen</p>
                    )}
                  </div>
                )}

              </div>
            } />
          )}

          {/* ── Lähetä-nappi ─────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={!!ehdotonValittu}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-colors shadow-sm"
            style={{
              background: ehdotonValittu ? '#e5e7eb' : voidaanLähettää ? '#1D9E75' : '#9ca3af',
              color:      ehdotonValittu ? '#9ca3af' : '#fff',
              cursor:     ehdotonValittu ? 'not-allowed' : 'pointer',
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
