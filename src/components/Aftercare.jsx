const TYYPPIVARI = {
  venyttely:   'bg-blue-50 text-blue-700',
  lämpöhoito:  'bg-orange-50 text-orange-700',
  kylmähoito:  'bg-cyan-50 text-cyan-700',
  liike:       'bg-green-50 text-green-700',
  ergonomia:   'bg-purple-50 text-purple-700',
  lepo:        'bg-gray-50 text-gray-600',
}

const TYYPPI_MIKSI = {
  venyttely:   'Palauttaa lihaksen normaalipituuden ja vähentää kiristyksen aiheuttamaa kipua.',
  lämpöhoito:  'Lisää verenkiertoa ja rentouttaa lihaskireyttä.',
  kylmähoito:  'Vähentää tulehdusta ja lievittää akuuttia kipua.',
  liike:       'Aktivoi alikäytettyjä lihaksia ja opettaa kehon oikean asennon.',
  ergonomia:   'Pitää hoidon tuloksen ja estää kipujen uusiutumisen arjessa.',
  lepo:        'Antaa keholle aikaa palautua ja kudoksille toipua rasituksesta.',
}

const OSIOT = [
  {
    id:      'venytykset',
    otsikko: 'Venytykset',
    tyypit:  ['venyttely', 'lämpöhoito', 'kylmähoito'],
  },
  {
    id:      'harjoitteet',
    otsikko: 'Aktivointiharjoitteet',
    tyypit:  ['liike'],
  },
  {
    id:      'asento',
    otsikko: 'Asento-ohjeet',
    tyypit:  ['ergonomia', 'lepo'],
  },
]

function TyyppiMerkki({ tyyppi }) {
  const cls = TYYPPIVARI[tyyppi] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {tyyppi}
    </span>
  )
}

function OhjeKortti({ ohje }) {
  return (
    <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-4">
      <TyyppiMerkki tyyppi={ohje.tyyppi} />
      <p className="text-xs text-gray-400 italic">
        {TYYPPI_MIKSI[ohje.tyyppi] ?? ''}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed">{ohje.ohje}</p>
      {ohje.toistot && (
        <p className="text-xs font-medium text-brand-700 bg-brand-50 rounded-lg px-3 py-1.5 self-start">
          {ohje.toistot}
        </p>
      )}
    </div>
  )
}

function Osio({ otsikko, ohjeet }) {
  if (!ohjeet.length) return null
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 text-base mb-4">{otsikko}</h3>
      <div className="flex flex-col gap-3">
        {ohjeet.map((o, i) => <OhjeKortti key={i} ohje={o} />)}
      </div>
    </div>
  )
}

export default function Aftercare({ findings = [], treatmentPlan = null }) {
  const jalkihoito = treatmentPlan?.jalkihoito ?? []

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Jälkihoito</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Ohjeet hoidon jälkeiseen palautumiseen ja omatoimiseen huoltoon.
        </p>
      </div>

      {!treatmentPlan ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">
            Tee ensin <strong>kehon kartoitus</strong> ja <strong>analyysi</strong> — jälkihoito-ohjeet
            muodostuvat automaattisesti hoitosuunnitelman pohjalta.
          </p>
        </div>
      ) : (
        <>
          {findings.length > 0 && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-3 text-sm text-brand-800">
              Ohjeet laadittu <span className="font-semibold">{findings.length} löydöksen</span> perusteella.
            </div>
          )}

          {OSIOT.map(({ id, otsikko, tyypit }) => (
            <Osio
              key={id}
              otsikko={otsikko}
              ohjeet={jalkihoito.filter((j) => tyypit.includes(j.tyyppi))}
            />
          ))}

          {jalkihoito.length === 0 && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">
                Hoitosuunnitelma ei sisältänyt jälkihoito-ohjeita.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
