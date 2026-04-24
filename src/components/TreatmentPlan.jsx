import { useState } from 'react'
import { buildPrompt, parseResponse } from '../services/api'

const S = {
  section:       { display: 'flex', flexDirection: 'column', gap: '24px' },
  heading:       { fontSize: '24px', fontWeight: '600', color: '#1f2937', margin: 0 },
  subtext:       { marginTop: '4px', color: '#6b7280', fontSize: '14px', margin: '4px 0 0' },
  card:          { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #f3f4f6', padding: '20px' },
  greenCard:     { background: '#f0fdf7', border: '1px solid #d1fae5', borderRadius: '12px', padding: '16px' },
  emptyBox:      { background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb', padding: '40px', textAlign: 'center' },
  emptyText:     { color: '#9ca3af', fontSize: '14px', margin: 0 },
  btnGreen:      { background: '#1D9E75', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', display: 'block', width: '100%' },
  btnGreenDim:   { background: '#1D9E75', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', display: 'block', width: '100%', opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' },
  btnGray:       { background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
  btnBack:       { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px', display: 'block', width: '100%', textAlign: 'center', padding: '8px' },
  textarea:      { width: '100%', minHeight: '150px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#374151', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  hintText:      { marginTop: '8px', fontSize: '12px', textAlign: 'center', color: '#9ca3af' },
  label:         { fontSize: '12px', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' },
  findingRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' },
  vasChip:       (kipu) => ({
    fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px',
    background: kipu === 0 ? '#eff6ff' : kipu <= 3 ? '#f0fdf4' : kipu <= 6 ? '#fff7ed' : '#fef2f2',
    color:      kipu === 0 ? '#2563eb' : kipu <= 3 ? '#15803d'  : kipu <= 6 ? '#c2410c'  : '#b91c1c',
  }),
  stepList:      { listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  stepItem:      { display: 'flex', gap: '8px', fontSize: '14px', color: '#4b5563' },
  stepNum:       { fontWeight: '600', color: '#1D9E75', flexShrink: 0 },
  sectionTitle:  { fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px' },
  bulletList:    { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  bulletItem:    { display: 'flex', gap: '8px', fontSize: '14px', color: '#374151' },
  dot:           { color: '#1D9E75', fontWeight: '700', flexShrink: 0 },
  actionList:    { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' },
  actionItem:    { display: 'flex', gap: '12px' },
  badge:         { flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#1D9E75', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' },
  actionBody:    { flex: 1, minWidth: 0 },
  actionHead:    { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' },
  actionName:    { fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  sidePill:      { fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' },
  technique:     { fontSize: '12px', fontWeight: '500', color: '#1D9E75', marginBottom: '4px' },
  actionDesc:    { fontSize: '14px', color: '#4b5563', lineHeight: '1.5' },
  afterList:     { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' },
  afterItem:     { display: 'flex', gap: '12px' },
  typePill:      (tyyppi) => {
    const map = {
      venyttely:  { background: '#eff6ff', color: '#1d4ed8' },
      lämpöhoito: { background: '#fff7ed', color: '#c2410c' },
      kylmähoito: { background: '#ecfeff', color: '#0e7490' },
      liike:      { background: '#f0fdf4', color: '#15803d' },
      ergonomia:  { background: '#faf5ff', color: '#7e22ce' },
      lepo:       { background: '#f9fafb', color: '#4b5563' },
    }
    const c = map[tyyppi] ?? { background: '#f3f4f6', color: '#374151' }
    return { ...c, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '9999px', flexShrink: 0, textTransform: 'capitalize', whiteSpace: 'nowrap' }
  },
  afterBody:     { flex: 1, minWidth: 0 },
  afterText:     { fontSize: '14px', color: '#374151', lineHeight: '1.5' },
  afterReps:     { fontSize: '12px', color: '#9ca3af', marginTop: '4px' },
}

export default function TreatmentPlan({ findings = [], havainnot = null, onResult }) {
  const [vaihe, setVaihe]     = useState('odottaa')
  const [vastaus, setVastaus] = useState('')
  const [tulos, setTulos]     = useState(null)

  const analysoi = () => {
    const prompt = buildPrompt(findings, havainnot)
    console.log("Prompt rakennettu:", prompt.substring(0, 100))

    // Fire-and-forget — don't block state transition on clipboard
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt)
        .then(() => console.log("Clipboard onnistui"))
        .catch(err => console.log("Clipboard epäonnistui:", err))
    }

    console.log("Vaihdetaan tilaan kopioitu")
    setVastaus('')
    setTulos(null)
    setVaihe('kopioitu')
    console.log("Tila vaihdettu")
  }

  const käytäVastausta = () => {
    console.log("käytäVastausta kutsuttu, vastaus:", vastaus.substring(0, 100))
    const result = parseResponse(vastaus)
    setTulos(result)
    setVaihe('tulos')
    onResult?.(result)
  }

  const nollaa = () => {
    setVaihe('odottaa')
    setVastaus('')
    setTulos(null)
  }

  return (
    <section style={S.section}>
      <div>
        <h2 style={S.heading}>Hoitosuunnitelma</h2>
        <p style={S.subtext}>AI-avusteinen analyysi kehon kartoituslöydöksistä.</p>
      </div>

      {/* ── VAIHE 1 — odottaa ─────────────────────────────────────────────── */}
      {vaihe === 'odottaa' && (
        findings.length === 0 ? (
          <div style={S.emptyBox}>
            <p style={S.emptyText}>
              Tee ensin kehon kartoitus <strong>Kehokartta</strong>-välilehdellä.
            </p>
          </div>
        ) : (
          <div style={S.card}>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
              <strong style={{ color: '#1f2937' }}>{findings.length} löydöstä</strong> valmiina analysoitavaksi:
            </p>
            <div style={{ marginBottom: '20px' }}>
              {findings.map((f, i) => (
                <div key={i} style={S.findingRow}>
                  <span style={{ color: '#374151' }}>{f.alue}</span>
                  <span style={S.vasChip(f.kipu)}>VAS {f.kipu}</span>
                </div>
              ))}
            </div>
            <button
              style={S.btnGreen}
              onClick={() => {
                console.log("NAPPI PAINETTU")
                analysoi()
              }}
            >
              Analysoi AI:lla →
            </button>
            <p style={{ ...S.hintText, marginTop: '12px' }}>Analyysi vie noin 30 sekuntia</p>
          </div>
        )
      )}

      {/* ── VAIHE 2 — kopioitu ────────────────────────────────────────────── */}
      {vaihe === 'kopioitu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={S.greenCard}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
              ✓ Prompt kopioitu leikepöydälle
            </p>
          </div>

          <div style={S.card}>
            <ol style={S.stepList}>
              <li style={S.stepItem}>
                <span style={S.stepNum}>1.</span>
                Avaa <strong style={{ color: '#1f2937' }}>Claude.ai</strong>
              </li>
              <li style={S.stepItem}>
                <span style={S.stepNum}>2.</span>
                Liitä prompt <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>Ctrl+V</kbd>
              </li>
              <li style={S.stepItem}>
                <span style={S.stepNum}>3.</span>
                Kopioi Clauden vastaus
              </li>
              <li style={S.stepItem}>
                <span style={S.stepNum}>4.</span>
                Liitä alle ja paina <strong style={{ color: '#1f2937' }}>Käytä vastausta</strong>
              </li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
              <button
                style={S.btnGray}
                onClick={async () => {
                  const prompt = buildPrompt(findings, havainnot)
                  await navigator.clipboard.writeText(prompt)
                }}
              >
                Kopioi
              </button>
              <button
                style={S.btnGray}
                onClick={async () => {
                  const text = await navigator.clipboard.readText()
                  setVastaus(text)
                }}
              >
                Liitä leikepöydältä
              </button>
            </div>

            <textarea
              value={vastaus}
              onChange={(e) => setVastaus(e.target.value)}
              placeholder="Liitä Clauden vastaus tähän..."
              style={S.textarea}
            />

            {(() => {
              const voidaanKayttaa = vastaus.trim().length > 50
              return (
                <>
                  <button
                    style={{ ...( voidaanKayttaa ? S.btnGreen : S.btnGreenDim ), marginTop: '12px' }}
                    onClick={voidaanKayttaa ? käytäVastausta : undefined}
                  >
                    Käytä vastausta →
                  </button>
                  {!voidaanKayttaa && (
                    <p style={S.hintText}>Liitä ensin Clauden vastaus tekstikenttään</p>
                  )}
                </>
              )
            })()}
          </div>

          <button style={S.btnBack} onClick={nollaa}>← Palaa löydöksiin</button>
        </div>
      )}

      {/* ── VAIHE 3 — tulos ───────────────────────────────────────────────── */}
      {vaihe === 'tulos' && tulos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={S.card}>
            <p style={S.sectionTitle}>Yhteenveto</p>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{tulos.yhteenveto}</p>
          </div>

          {tulos.aiheuttajat?.length > 0 && (
            <div style={S.card}>
              <p style={S.sectionTitle}>Miksi kipu esiintyy juuri näissä kohdissa?</p>
              <ul style={S.bulletList}>
                {tulos.aiheuttajat.map((syy, i) => (
                  <li key={i} style={S.bulletItem}>
                    <span style={S.dot}>·</span>
                    <span>{syy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tulos.toimenpiteet?.length > 0 && (
            <div style={S.card}>
              <p style={S.sectionTitle}>Käsittelyjärjestys</p>
              <ol style={S.actionList}>
                {tulos.toimenpiteet.map((t, i) => (
                  <li key={i} style={S.actionItem}>
                    <span style={S.badge}>{t.jarjestys ?? i + 1}</span>
                    <div style={S.actionBody}>
                      <div style={S.actionHead}>
                        <span style={S.actionName}>{t.rakenne}</span>
                        {t.puoli && t.puoli !== 'molemmat' && (
                          <span style={S.sidePill}>{t.puoli}</span>
                        )}
                      </div>
                      {t.tekniikka && <p style={S.technique}>{t.tekniikka}</p>}
                      <p style={S.actionDesc}>{t.selitys}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tulos.jalkihoito?.length > 0 && (
            <div style={S.card}>
              <p style={S.sectionTitle}>Jälkihoito-ohjeet kotiin</p>
              <ul style={S.afterList}>
                {tulos.jalkihoito.map((j, i) => (
                  <li key={i} style={S.afterItem}>
                    <span style={S.typePill(j.tyyppi)}>{j.tyyppi}</span>
                    <div style={S.afterBody}>
                      <p style={S.afterText}>{j.ohje}</p>
                      {j.toistot && <p style={S.afterReps}>{j.toistot}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button style={S.btnBack} onClick={nollaa}>← Palaa löydöksiin</button>
        </div>
      )}
    </section>
  )
}
