import Kentta from './Kentta'
import Ryhma from './Ryhma'

const otsikkoTyyli = {
  fontSize:   '16px',
  fontWeight: '700',
  color:      '#111827',
  margin:     '0 0 16px 0',
  letterSpacing: '0.02em',
}

// Käy kentät läpi järjestyksessä. Ryhmättömät renderöidään sellaisenaan.
// Ryhmälliset kerätään ryhmittäin, ja kunkin ryhmän ensimmäinen esiintymä
// laukaisee koko ryhmän renderöinnin sille kohdalle.
function ryhmittele(kenttat, ryhmittelyt) {
  const ryhmaIndex = new Map((ryhmittelyt ?? []).map((r) => [r.id, r]))
  const ryhmittain = new Map()
  for (const kf of kenttat) {
    if (!kf.ryhma) continue
    if (!ryhmittain.has(kf.ryhma)) ryhmittain.set(kf.ryhma, [])
    ryhmittain.get(kf.ryhma).push(kf)
  }

  const tulokset = []
  const renderoidyt = new Set()

  for (const kf of kenttat) {
    if (!kf.ryhma) {
      tulokset.push({ tyyppi: 'kentta', kf })
      continue
    }
    if (renderoidyt.has(kf.ryhma)) continue
    const ryhma = ryhmaIndex.get(kf.ryhma)
    const ryhmanKentat = ryhmittain.get(kf.ryhma) ?? []
    if (ryhma) {
      tulokset.push({ tyyppi: 'ryhma', ryhma, kenttat: ryhmanKentat })
    } else {
      // Ryhmäviittaus mutta ryhmittelyä ei ole — renderöidään suoraan jotta kentät eivät katoa.
      for (const sisaKf of ryhmanKentat) tulokset.push({ tyyppi: 'kentta', kf: sisaKf })
    }
    renderoidyt.add(kf.ryhma)
  }

  return tulokset
}

export default function Osio({ osio, kentat, vastaukset, virheet, onKenttamuutos, naytaOtsikko = true }) {
  const otsikko = typeof osio.otsikko === 'object' ? (osio.otsikko.fi ?? osio.id) : (osio.otsikko ?? osio.id)
  const kenttat = (osio.kenttat ?? []).slice().sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0))
  const palaset = ryhmittele(kenttat, osio.ryhmittelyt)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {naytaOtsikko && <h3 style={otsikkoTyyli}>{otsikko}</h3>}

      {kenttat.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
          Tämä osio ei sisällä kenttiä.
        </p>
      )}

      {palaset.map((p) => {
        if (p.tyyppi === 'kentta') {
          const tunniste = p.kf.kentta_id_tunniste
          return (
            <Kentta
              key={tunniste}
              kentta={kentat[tunniste]}
              kenttamerkinta={p.kf}
              arvo={vastaukset[tunniste]}
              virhe={virheet?.[tunniste]}
              onMuutos={(uusiArvo) => onKenttamuutos(tunniste, uusiArvo)}
            />
          )
        }
        return (
          <Ryhma
            key={p.ryhma.id}
            ryhma={p.ryhma}
            kentat={kentat}
            kentanmerkinnat={p.kenttat}
            vastaukset={vastaukset}
            virheet={virheet}
            onKenttamuutos={onKenttamuutos}
          />
        )
      })}
    </section>
  )
}
