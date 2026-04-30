import Kentta from './Kentta'

const otsikkoTyyli = {
  fontSize:   '16px',
  fontWeight: '700',
  color:      '#111827',
  margin:     '0 0 16px 0',
  letterSpacing: '0.02em',
}

export default function Osio({ osio, kentat, vastaukset, onKenttamuutos }) {
  const otsikko = typeof osio.otsikko === 'object' ? (osio.otsikko.fi ?? osio.id) : (osio.otsikko ?? osio.id)
  const kenttat = osio.kenttat ?? []

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={otsikkoTyyli}>{otsikko}</h3>

      {kenttat.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
          Tämä osio ei sisällä kenttiä.
        </p>
      )}

      {kenttat.map((kenttamerkinta) => {
        const tunniste = kenttamerkinta.kentta_id_tunniste
        return (
          <Kentta
            key={tunniste}
            kentta={kentat[tunniste]}
            kenttamerkinta={kenttamerkinta}
            arvo={vastaukset[tunniste]}
            onMuutos={(uusiArvo) => onKenttamuutos(tunniste, uusiArvo)}
          />
        )
      })}
    </section>
  )
}
