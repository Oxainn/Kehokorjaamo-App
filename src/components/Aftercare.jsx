import jsPDF from 'jspdf'

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
  { id: 'venytykset',  otsikko: 'Venytykset',           tyypit: ['venyttely', 'lämpöhoito', 'kylmähoito'] },
  { id: 'harjoitteet', otsikko: 'Aktivointiharjoitteet', tyypit: ['liike'] },
  { id: 'asento',      otsikko: 'Asento-ohjeet',         tyypit: ['ergonomia', 'lepo'] },
]

// ── PDF-generointi ────────────────────────────────────────────────────────────

function generatePDF(findings, treatmentPlan) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const W     = 210
  const H     = 297
  const mL    = 20
  const mR    = 20
  const mT    = 22
  const mB    = 28
  const tw    = W - mL - mR   // käytettävä tekstileveys
  let y       = mT

  const pvm = new Date().toLocaleDateString('fi-FI', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const lisääAlatunniste = () => {
    const n = doc.internal.getCurrentPageInfo().pageNumber
    doc.setFontSize(8)
    doc.setTextColor(160)
    doc.text('Kalevalapaja x Jari Tossavainen, Espoo', mL, H - 12)
    doc.text(`${n}`, W - mR, H - 12, { align: 'right' })
    doc.setTextColor(0)
  }

  const uusiSivu = () => {
    lisääAlatunniste()
    doc.addPage()
    y = mT
  }

  const tarkistaLisa = (tarvitaan) => {
    if (y + tarvitaan > H - mB) uusiSivu()
  }

  const tekstiRivit = (teksti, fonttiKoko, leveys = tw) => {
    doc.setFontSize(fonttiKoko)
    return doc.splitTextToSize(teksti, leveys)
  }

  const kirjoita = (rivit, fonttiKoko, vari = [30, 30, 30], riviVali = 1.4) => {
    doc.setFontSize(fonttiKoko)
    doc.setTextColor(...vari)
    rivit.forEach((rivi) => {
      tarkistaLisa(fonttiKoko * riviVali * 0.35)
      doc.text(rivi, mL, y)
      y += fonttiKoko * riviVali * 0.35
    })
    doc.setTextColor(0)
  }

  // ── Ylätunniste ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  kirjoita(['Kehokorjaamo — Jalkihoito-ohjeet'], 17)
  y += 1

  doc.setFont('helvetica', 'normal')
  kirjoita([pvm], 9, [120, 120, 120])
  y += 3

  doc.setDrawColor(210)
  doc.line(mL, y, W - mR, y)
  y += 7

  // ── Löydökset ────────────────────────────────────────────────────────────────
  if (findings?.length) {
    doc.setFont('helvetica', 'bold')
    kirjoita(['Löydökset'], 12, [40, 40, 40])
    y += 2
    doc.setFont('helvetica', 'normal')

    findings.forEach((f) => {
      const osat = [`${f.alue}  —  VAS ${f.kipu}/10`]
      if (f.kallistus) osat.push(`Kallistus: ${f.kallistus}`)
      if (f.kierto)    osat.push(`Kierto: ${f.kierto}`)
      tarkistaLisa(6)
      kirjoita([osat.join('   ')], 9, [70, 70, 70])
    })
    y += 5
  }

  // ── Jälkihoito-osiot ─────────────────────────────────────────────────────────
  const jalkihoito = treatmentPlan?.jalkihoito ?? []

  OSIOT.forEach(({ otsikko, tyypit }) => {
    const ohjeet = jalkihoito.filter((j) => tyypit.includes(j.tyyppi))
    if (!ohjeet.length) return

    tarkistaLisa(14)
    doc.setFont('helvetica', 'bold')
    kirjoita([otsikko], 12, [40, 40, 40])
    y += 1

    doc.setDrawColor(220)
    doc.line(mL, y, W - mR, y)
    y += 5

    ohjeet.forEach((ohje) => {
      // Tyyppi-rivi
      doc.setFont('helvetica', 'bold')
      kirjoita([ohje.tyyppi.charAt(0).toUpperCase() + ohje.tyyppi.slice(1)], 9, [60, 100, 70])

      // Miksi tärkeä
      doc.setFont('helvetica', 'italic')
      const miksiRivit = tekstiRivit(TYYPPI_MIKSI[ohje.tyyppi] ?? '', 8)
      kirjoita(miksiRivit, 8, [130, 130, 130])
      y += 1

      // Ohje
      doc.setFont('helvetica', 'normal')
      const ohjeRivit = tekstiRivit(ohje.ohje, 9)
      kirjoita(ohjeRivit, 9)

      // Toistot
      if (ohje.toistot) {
        doc.setFont('helvetica', 'bold')
        const toistotRivit = tekstiRivit(ohje.toistot, 8)
        kirjoita(toistotRivit, 8, [40, 100, 60])
      }

      y += 5
    })

    y += 3
  })

  // ── Viimeisen sivun alatunniste ───────────────────────────────────────────────
  lisääAlatunniste()

  const tiedostonimi = `jalkihoito-ohjeet-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(tiedostonimi)
}

// ── Komponentti ───────────────────────────────────────────────────────────────

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

          <button
            onClick={() => generatePDF(findings, treatmentPlan)}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Lataa PDF →
          </button>
        </>
      )}
    </section>
  )
}
