import Osio from '../Osio'

export default function NayttoYksiSivu({ rakenne, kentat, vastaukset, onKenttamuutos }) {
  const osiot = (rakenne?.osiot ?? []).slice().sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {osiot.map((osio) => (
        <div
          key={osio.id}
          style={{
            background:    'white',
            borderRadius:  '16px',
            border:        '1px solid #e2e8f0',
            boxShadow:     '0 1px 4px rgba(0,0,0,0.05)',
            padding:       '24px',
          }}
        >
          <Osio
            osio={osio}
            kentat={kentat}
            vastaukset={vastaukset}
            onKenttamuutos={onKenttamuutos}
          />
        </div>
      ))}
    </div>
  )
}
