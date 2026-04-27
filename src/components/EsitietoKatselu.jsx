const Row = ({ label, arvo }) => (
  <div style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
    <span style={{ color: '#999', minWidth: '100px' }}>{label}</span>
    <span style={{ color: '#333' }}>{arvo || '—'}</span>
  </div>
)

export default function EsitietoKatselu({ esitiedot, onTallennaAsiakkaaksi, onSulje }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Esitiedot — {esitiedot.nimi}</h2>
        <button onClick={onSulje} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', color: '#999', fontWeight: '500', textTransform: 'uppercase', margin: '0 0 8px' }}>Perustiedot</p>
        <Row label="Nimi"       arvo={esitiedot.nimi} />
        <Row label="Sähköposti" arvo={esitiedot.sahkoposti} />
        <Row label="Puhelin"    arvo={esitiedot.puhelin} />
        <Row label="Palvelu"    arvo={esitiedot.palvelu} />
        <Row label="Saapui"     arvo={new Date(esitiedot.luotu).toLocaleString('fi-FI')} />
      </div>

      {esitiedot.hoitoon_syy && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#999', fontWeight: '500', textTransform: 'uppercase', margin: '0 0 8px' }}>Hoitoon tulon syy</p>
          <p style={{ fontSize: '13px', color: '#333', background: '#F8FAFC', padding: '10px', borderRadius: '8px', margin: 0 }}>
            {esitiedot.hoitoon_syy}
          </p>
        </div>
      )}

      {esitiedot.kipuaste > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#999', fontWeight: '500', textTransform: 'uppercase', margin: '0 0 4px' }}>Kipuaste</p>
          <span style={{
            fontSize: '20px',
            fontWeight: '500',
            color: esitiedot.kipuaste >= 7 ? '#E24B4A' : esitiedot.kipuaste >= 4 ? '#EF9F27' : '#1D9E75',
          }}>
            VAS {esitiedot.kipuaste}/10
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        <button
          onClick={() => onTallennaAsiakkaaksi(esitiedot)}
          style={{ flex: 1, padding: '10px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          Tallenna asiakkaaksi →
        </button>
        <button
          onClick={onSulje}
          style={{ padding: '10px 16px', background: 'transparent', color: '#666', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
        >
          Sulje
        </button>
      </div>
    </div>
  )
}
