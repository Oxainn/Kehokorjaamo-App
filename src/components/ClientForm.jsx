import { useState, useEffect } from 'react'

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
  suostumus_rekisteri: false,
  suostumus_luovutus:  false,
  huoltajan_suostumus: '',
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

export default function ClientForm({ onComplete }) {
  const [data, setData] = useState(() => {
    try {
      const tallennettu = localStorage.getItem(STORAGE_KEY)
      return tallennettu ? JSON.parse(tallennettu) : TYHJÄ
    } catch {
      return TYHJÄ
    }
  })

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

  const toggleTietosuoja = (kenttä) => {
    setData((prev) => ({ ...prev, [kenttä]: !prev[kenttä] }))
  }

  const lähetä = (e) => {
    e.preventDefault()
    onComplete?.(data)
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

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          Tallenna ja jatka →
        </button>
      </form>
    </section>
  )
}
