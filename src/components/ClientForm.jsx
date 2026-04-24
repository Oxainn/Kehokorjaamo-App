import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'kehokorjaamo_asiakasdata'

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
  ammatti:          '',
  harrastukset:     '',
  hoitoon_syy:      '',
  laakitys:         '',
  miten_loysi:      '',
  kontraindikaatiot: {},
  sairaudet:        '',
  vammat:           '',
  kipuaste:         0,
  oireet:           {},
  suostumus_rekisteri: false,
  suostumus_luovutus:  false,
  huoltajan_suostumus: '',
  paivays:          new Date().toISOString().slice(0, 10),
  allekirjoitus:    '',
  huoltajan_allekirjoitus: '',
}

function laskikaIka(syntymaaika) {
  if (!syntymaaika) return null
  const syntyma = new Date(syntymaaika)
  const tanaan  = new Date()
  let ika = tanaan.getFullYear() - syntyma.getFullYear()
  const kk = tanaan.getMonth() - syntyma.getMonth()
  if (kk < 0 || (kk === 0 && tanaan.getDate() < syntyma.getDate())) ika--
  return ika
}

function TextInput({ label, name, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  )
}

function TextArea({ label, name, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${
          checked ? 'bg-brand-600' : 'bg-gray-200'
        }`}
      >
        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <span className="text-sm text-gray-700 leading-snug">{label}</span>
    </div>
  )
}

function Osio({ otsikko, lapset }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 text-base mb-4">{otsikko}</h3>
      <div className="flex flex-col gap-4">{lapset}</div>
    </div>
  )
}

export default function ClientForm({ onComplete, esitäytö = null }) {
  const [data, setData] = useState(() => {
    if (esitäytö) return { ...TYHJÄ, ...esitäytö }
    try {
      const tallennettu = localStorage.getItem(STORAGE_KEY)
      return tallennettu ? JSON.parse(tallennettu) : TYHJÄ
    } catch {
      return TYHJÄ
    }
  })

  const canvasRef        = useRef(null)
  const piirrosDataRef   = useRef(esitäytö?.piirros ?? null)
  const [valittuPiirto, setValittuPiirto] = useState(1)

  const piirraPiste = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const touches = e.touches ?? [e]
    Array.from(touches).forEach(t => {
      const x = (t.clientX - rect.left) * scaleX
      const y = (t.clientY - rect.top)  * scaleY
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = PIIRTOVÄRIT[valittuPiirto] + 'cc'
      ctx.fill()
    })
  }

  const alustaCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== canvas.offsetWidth) {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    if (piirrosDataRef.current) {
      const src = piirrosDataRef.current
      piirrosDataRef.current = null
      const img = new Image()
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = src
    }
  }

  const tyhjennäCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  // Tallennetaan localStorageen automaattisesti
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const päivitä = (e) => {
    const { name, value } = e.target
    setData((prev) => ({ ...prev, [name]: value }))
  }

  const toggleKontra = (nimi) => {
    setData((prev) => ({
      ...prev,
      kontraindikaatiot: {
        ...prev.kontraindikaatiot,
        [nimi]: !prev.kontraindikaatiot[nimi],
      },
    }))
  }

  const toggleOire = (id) => {
    setData((prev) => ({
      ...prev,
      oireet: {
        ...prev.oireet,
        [id]: prev.oireet[id] ? { ...prev.oireet[id], valittu: !prev.oireet[id].valittu } : { valittu: true, sijainti: '' },
      },
    }))
  }

  const päivitäOireSijainti = (id, sijainti) => {
    setData((prev) => ({
      ...prev,
      oireet: { ...prev.oireet, [id]: { ...prev.oireet[id], sijainti } },
    }))
  }

  const toggleTietosuoja = (kenttä) => {
    setData((prev) => ({ ...prev, [kenttä]: !prev[kenttä] }))
  }

  const kipuVari = (arvo) => {
    if (arvo <= 3) return { kehys: '#16a34a', tausta: '#dcfce7', teksti: '#15803d' }
    if (arvo <= 6) return { kehys: '#ea580c', tausta: '#ffedd5', teksti: '#c2410c' }
    return { kehys: '#dc2626', tausta: '#fee2e2', teksti: '#b91c1c' }
  }

  const lähetä = (e) => {
    e.preventDefault()
    const avain = `kehokorjaamo_asiakas_${Date.now()}`
    localStorage.setItem(avain, JSON.stringify(data))
    if (typeof onComplete === 'function') {
      onComplete(data)
    } else {
      console.error('onComplete prop puuttuu!')
    }
  }

  const ika = laskikaIka(data.syntymaaika)
  const alleKahdeksantoista = ika !== null && ika < 18
  const ehdotonValittu = EHDOTTOMAT_KONTRA.some((e) => data.kontraindikaatiot[e])

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asiakastiedot</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Täytä tiedot ennen hoitoa. Tiedot tallennetaan automaattisesti.
        </p>
      </div>

      <form onSubmit={lähetä} className="flex flex-col gap-5">

        {/* ── Osio 1: Perustiedot ─────────────────────────────────────────── */}
        <Osio otsikko="Perustiedot" lapset={
          <>
            <TextInput label="Nimi" name="nimi" value={data.nimi} onChange={päivitä} required />
            <TextInput
              label="Syntymäaika"
              name="syntymaaika"
              value={data.syntymaaika}
              onChange={päivitä}
              type="date"
            />
            {alleKahdeksantoista && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                Asiakas on alle 18-vuotias — huoltajan suostumus vaaditaan (katso Tietosuoja-osio).
              </div>
            )}
            <TextInput label="Lähiosoite" name="lahiosoite" value={data.lahiosoite} onChange={päivitä} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Postinumero" name="postinumero" value={data.postinumero} onChange={päivitä} />
              <TextInput label="Postitoimipaikka" name="postitoimipaikka" value={data.postitoimipaikka} onChange={päivitä} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextInput label="Sähköposti" name="sahkoposti" value={data.sahkoposti} onChange={päivitä} type="email" />
              <TextInput label="Puhelin" name="puhelin" value={data.puhelin} onChange={päivitä} type="tel" />
            </div>
            <TextInput label="Työ / ammatti" name="ammatti" value={data.ammatti} onChange={päivitä} />
            <TextArea label="Harrastuksia" name="harrastukset" value={data.harrastukset} onChange={päivitä} />
            <TextArea label="Hoitoon tulon syy" name="hoitoon_syy" value={data.hoitoon_syy} onChange={päivitä} rows={4} />
            <TextArea label="Säännöllinen lääkitys" name="laakitys" value={data.laakitys} onChange={päivitä} />
            <TextInput label="Miten löysit meidät" name="miten_loysi" value={data.miten_loysi} onChange={päivitä} />
          </>
        } />

        {/* ── Osio 2: Terveystiedot ───────────────────────────────────────── */}
        <Osio otsikko="Terveystiedot" lapset={
          <>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Huomioitavat terveystiedot
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                {NORMAALI_KONTRA.map((nimi) => (
                  <label key={nimi} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!data.kontraindikaatiot[nimi]}
                      onChange={() => toggleKontra(nimi)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 leading-snug">{nimi}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-3">
                Ehdottomat kontraindikaatiot *
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                {EHDOTTOMAT_KONTRA.map((nimi) => (
                  <label key={nimi} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!data.kontraindikaatiot[nimi]}
                      onChange={() => toggleKontra(nimi)}
                      className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-red-700 leading-snug font-medium">{nimi}</span>
                  </label>
                ))}
              </div>
            </div>

            {ehdotonValittu && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700">
                  Hoito ei ole mahdollinen — ota yhteyttä hoitajaan
                </p>
              </div>
            )}

            <TextArea
              label="Diagnosoidut sairaudet"
              name="sairaudet"
              value={data.sairaudet}
              onChange={päivitä}
              rows={3}
            />
            <TextArea
              label="Vammat ja muut hoidossa huomioitavat seikat"
              name="vammat"
              value={data.vammat}
              onChange={päivitä}
              rows={3}
            />
          </>
        } />

        {/* ── Osio 4: Kiputilanne ─────────────────────────────────────────── */}
        <Osio otsikko="Kiputilanne" lapset={
          <>
            <div className="flex items-center gap-6">
              {/* Värillinen numero-ympyrä */}
              <div
                className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 transition-colors"
                style={{
                  backgroundColor: kipuVari(data.kipuaste).tausta,
                  borderColor:     kipuVari(data.kipuaste).kehys,
                  color:           kipuVari(data.kipuaste).teksti,
                }}
              >
                {data.kipuaste}
              </div>

              {/* Slider */}
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={data.kipuaste}
                  onChange={(e) => setData((prev) => ({ ...prev, kipuaste: Number(e.target.value) }))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${kipuVari(data.kipuaste).kehys} 0%, ${kipuVari(data.kipuaste).kehys} ${data.kipuaste * 10}%, #e5e7eb ${data.kipuaste * 10}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Ei kipua</span>
                  <span>Pahin mahdollinen</span>
                </div>
              </div>
            </div>
          </>
        } />

        {/* ── Osio 5: Kehon merkinnät ──────────────────────────────────────── */}
        <Osio otsikko="Kehon merkinnät" lapset={
          <>
            <p className="text-xs text-gray-500">
              Valitse oiretyyppi ja merkitse sijainti kehokuvaan sormella.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {OIRETYYPIT.map((tyyppi) => {
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

            {/* Hahmokuva piirtoalustana */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                marginTop: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <img
                src="/hahmokuvat.svg"
                style={{ width: '100%', display: 'block' }}
                alt="Kehon merkintäalue"
                onLoad={alustaCanvas}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: '100%',
                  touchAction: 'none',
                }}
                onTouchStart={(e) => { e.preventDefault(); alustaCanvas(); piirraPiste(e) }}
                onTouchMove={(e) => { e.preventDefault(); piirraPiste(e) }}
              />
            </div>

            <button
              type="button"
              onClick={tyhjennäCanvas}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors self-start"
            >
              Tyhjennä piirros
            </button>
          </>
        } />

        {/* ── Osio 3: Tietosuoja ──────────────────────────────────────────── */}
        <Osio otsikko="Tietosuoja" lapset={
          <>
            <Toggle
              label="Tietojani saa säilyttää asiakasrekisterissä"
              checked={data.suostumus_rekisteri}
              onChange={() => toggleTietosuoja('suostumus_rekisteri')}
            />
            <Toggle
              label="Tietoni saa luovuttaa hoitaville tahoille"
              checked={data.suostumus_luovutus}
              onChange={() => toggleTietosuoja('suostumus_luovutus')}
            />
            {alleKahdeksantoista && (
              <TextInput
                label="Huoltajan nimi ja suostumus (alle 18v)"
                name="huoltajan_suostumus"
                value={data.huoltajan_suostumus}
                onChange={päivitä}
              />
            )}
            <p className="text-xs text-gray-400 leading-relaxed">
              Tietoja käsitellään EU:n tietosuoja-asetuksen (GDPR) mukaisesti.
              Voit pyytää tietojesi poistamista milloin tahansa.
            </p>
          </>
        } />

        {/* ── Osio 6: Vahvistus ja allekirjoitus ──────────────────────────── */}
        <Osio otsikko="Vahvistus ja allekirjoitus" lapset={
          <>
            <TextInput
              label="Päiväys"
              name="paivays"
              value={data.paivays}
              onChange={päivitä}
              type="date"
            />
            <TextInput
              label="Allekirjoitus"
              name="allekirjoitus"
              value={data.allekirjoitus}
              onChange={päivitä}
            />
            {alleKahdeksantoista && (
              <TextInput
                label="Huoltajan allekirjoitus"
                name="huoltajan_allekirjoitus"
                value={data.huoltajan_allekirjoitus}
                onChange={päivitä}
              />
            )}
          </>
        } />

        {/* ── Osio 7: Yhteenveto ──────────────────────────────────────────── */}
        <Osio otsikko="Yhteenveto" lapset={
          <div className="flex flex-col gap-3 text-sm">
            {/* Nimi ja syntymäaika */}
            <div className="flex justify-between">
              <span className="text-gray-500">Nimi</span>
              <span className="font-medium text-gray-800">{data.nimi || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Syntymäaika</span>
              <span className="font-medium text-gray-800">
                {data.syntymaaika ? new Date(data.syntymaaika).toLocaleDateString('fi-FI') : '—'}
                {ika !== null && <span className="text-gray-400 ml-1">({ika} v)</span>}
              </span>
            </div>

            {/* Hoitoon tulon syy */}
            {data.hoitoon_syy && (
              <div>
                <span className="text-gray-500 block mb-1">Hoitoon tulon syy</span>
                <p className="text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                  {data.hoitoon_syy}
                </p>
              </div>
            )}

            {/* Kipuasteikko */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Kipuasteikko</span>
              <span
                className="font-bold text-base w-8 h-8 rounded-full flex items-center justify-center border-2"
                style={{
                  color:           kipuVari(data.kipuaste).teksti,
                  borderColor:     kipuVari(data.kipuaste).kehys,
                  backgroundColor: kipuVari(data.kipuaste).tausta,
                }}
              >
                {data.kipuaste}
              </span>
            </div>

            {/* Valitut oiretyypit */}
            {OIRETYYPIT.filter((t) => data.oireet[t.id]?.valittu).length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Oiretyypit</span>
                <div className="flex flex-col gap-1">
                  {OIRETYYPIT.filter((t) => data.oireet[t.id]?.valittu).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${t.vari} flex-shrink-0`} />
                      <span className="text-gray-700">{t.nimi}</span>
                      {data.oireet[t.id]?.sijainti && (
                        <span className="text-gray-400">— {data.oireet[t.id].sijainti}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kontraindikaatiot */}
            {Object.entries(data.kontraindikaatiot)
              .filter(([, v]) => v)
              .map(([nimi]) => nimi).length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Huomioitavat terveystiedot</span>
                <div className="flex flex-col gap-1">
                  {Object.entries(data.kontraindikaatiot)
                    .filter(([, v]) => v)
                    .map(([nimi]) => {
                      const ehdoton = EHDOTTOMAT_KONTRA.includes(nimi)
                      return (
                        <div key={nimi} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ehdoton ? 'bg-red-500' : 'bg-gray-400'}`} />
                          <span className={ehdoton ? 'text-red-700 font-medium' : 'text-gray-700'}>
                            {nimi}{ehdoton && ' *'}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        } />

        {/* ── Lähetysnappi ────────────────────────────────────────────────── */}
        {(() => {
          const voidaanLahettaa = !!data.nimi && data.suostumus_rekisteri && !ehdotonValittu
          return (
            <button
              type="submit"
              disabled={false}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              {ehdotonValittu ? 'Hoito ei ole mahdollinen' : 'Vahvista ja jatka →'}
            </button>
          )
        })()}
      </form>
    </section>
  )
}
