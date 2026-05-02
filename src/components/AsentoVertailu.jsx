// KA6 — Asentokuvien vertailu aiempiin käynteihin.
//
// Käytetään AsentoKuvat-komponentin Vertailu- ja Aikajana-välilehdissä.
//
// Vertailu:
//   - Pudotusvalikko aiemmista käynneistä (joilla on asentokuvia)
//   - Rinnakkais-näkymä: NYT vasemmalla, ENNEN oikealla (kaikki 4 kuvaa)
//   - Kulma-muutokset taulukossa muutos-suunta + emoji
//
// Aikajana:
//   - Listaa kaikki käynnit aikajärjestyksessä
//   - Pieni viivagraafi pää-kulmien muutoksesta ajan myötä
//   - Klikkaus käynti riviä → näytä sen käynnin kuvat lightboxissa
//
// Data tulee haeAsiakkaanAsentokuvaHistoria-fetcheristä — kaikki käyntien
// kuvat ja kulmat yhdellä haulla, ryhmiteltynä käyntien mukaan.

import { useEffect, useMemo, useState } from 'react'
import { haeAsiakkaanAsentokuvaHistoria } from '../lib/db'
import {
  KULMA_SELITTEET,
  yhdistaKulmat,
  laskeMuutokset,
  formatoiKulma,
} from '../lib/poseAnalysis'
import { KuvaLuurangolla } from './AsentoYhteenveto'

const NAKOKULMAT = [
  { id: 'edesta', nimi: 'Edestä' },
  { id: 'takaa',  nimi: 'Takaa' },
  { id: 'vasen',  nimi: 'Vasen sivu' },
  { id: 'oikea',  nimi: 'Oikea sivu' },
]

// Muotoile käynnin otsikko valikkoon: "Käynti 15.4.2026 — Niskakipu, alkuhoito"
function muotoiloKayntiNimi(kaynti) {
  const pvm = new Date(kaynti.luotu)
  const pvmStr = pvm.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
  const otsikko = (kaynti.otsikko ?? '').trim()
  return otsikko ? `${pvmStr} — ${otsikko}` : `Käynti ${pvmStr}`
}

// ─────────────────────────────────────────────────────────────────────────
// VERTAILU-VÄLILEHTI
// ─────────────────────────────────────────────────────────────────────────

export function Vertailu({ hoitokayntiId, asiakasId }) {
  const [historia, setHistoria] = useState([])  // [{hoitokayntiId, kuvat, ...}]
  const [vertailuId, setVertailuId] = useState(null)
  const [lataa, setLataa] = useState(true)

  useEffect(() => {
    if (!asiakasId) return
    let peruttu = false
    setLataa(true)
    haeAsiakkaanAsentokuvaHistoria(asiakasId).then((rivit) => {
      if (peruttu) return
      setHistoria(rivit)
      setLataa(false)
    })
    return () => { peruttu = true }
  }, [asiakasId])

  const nykyinen = historia.find((h) => h.hoitokayntiId === hoitokayntiId)
  const aiemmat = historia.filter((h) => h.hoitokayntiId !== hoitokayntiId)
  const vertailu = vertailuId ? historia.find((h) => h.hoitokayntiId === vertailuId) : null

  // Auto-valitse uusin aiempi käynti jos saatavilla
  useEffect(() => {
    if (!vertailuId && aiemmat.length > 0) {
      setVertailuId(aiemmat[0].hoitokayntiId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiemmat.length])

  if (lataa) {
    return <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Ladataan vertailudataa…</p>
  }
  if (!nykyinen || Object.keys(nykyinen.kuvat).length === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
        Ota tämän käynnin asentokuvat ensin — vertailu vaatii vähintään yhden kuvan tältä käynniltä.
      </p>
    )
  }
  if (aiemmat.length === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
        Ei aiempia käyntejä joista olisi asentokuvia. Vertailu mahdollistuu seuraavalla käynnillä.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
          Vertaile käyntiin:
        </label>
        <select
          value={vertailuId ?? ''}
          onChange={(e) => setVertailuId(e.target.value)}
          style={{
            padding:      '6px 10px',
            fontSize:     '13px',
            border:       '1px solid #e5e7eb',
            borderRadius: '6px',
            background:   'white',
            color:        '#111827',
            cursor:       'pointer',
          }}
        >
          {aiemmat.map((k) => (
            <option key={k.hoitokayntiId} value={k.hoitokayntiId}>
              {muotoiloKayntiNimi(k)}
            </option>
          ))}
        </select>
      </div>

      {vertailu && (
        <>
          <RinnakkaisNakyma nykyinen={nykyinen} ennen={vertailu} />
          <MuutoksetTaulukko nykyinen={nykyinen} ennen={vertailu} />
        </>
      )}
    </div>
  )
}

function RinnakkaisNakyma({ nykyinen, ennen }) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap:                 '14px',
    }}>
      <KayntiPalsta otsikko="NYT" pvm={nykyinen.luotu} kuvat={nykyinen.kuvat} />
      <KayntiPalsta otsikko="ENNEN" pvm={ennen.luotu} kuvat={ennen.kuvat} />
    </div>
  )
}

function KayntiPalsta({ otsikko, pvm, kuvat }) {
  const pvmStr = new Date(pvm).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
  return (
    <div style={{
      background:   'white',
      border:       '1px solid #e5e7eb',
      borderRadius: '10px',
      padding:      '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h4 style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         '#374151',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin:        0,
        }}>
          {otsikko}
        </h4>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>{pvmStr}</span>
      </div>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap:                 '6px',
      }}>
        {NAKOKULMAT.map((n) => (
          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
              aspectRatio:  '3/4',
              background:   kuvat[n.id]?.kuva_data ? 'transparent' : '#f9fafb',
              border:       kuvat[n.id]?.kuva_data ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
              borderRadius: '6px',
              overflow:     'hidden',
            }}>
              {kuvat[n.id]?.kuva_data ? (
                <KuvaLuurangolla kuva={kuvat[n.id]} alt={n.nimi} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9ca3af' }}>
                  ei kuvaa
                </div>
              )}
            </div>
            <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', fontWeight: 600 }}>
              {n.nimi}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MuutoksetTaulukko({ nykyinen, ennen }) {
  const muutokset = useMemo(() => {
    const nyk = yhdistaKulmat(nykyinen.kuvat)
    const enn = yhdistaKulmat(ennen.kuvat)
    return laskeMuutokset(nyk, enn)
  }, [nykyinen, ennen])

  if (muutokset.length === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
        Ei vertailtavissa olevia kulmia (puuttuva data jollakin käynnillä).
      </p>
    )
  }

  return (
    <div style={{
      background:   'white',
      border:       '1px solid #e5e7eb',
      borderRadius: '10px',
      overflow:     'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={otsikkoTyyli}>Mittaus</th>
              <th style={{ ...otsikkoTyyli, textAlign: 'right' }}>Ennen</th>
              <th style={{ ...otsikkoTyyli, textAlign: 'right' }}>Nyt</th>
              <th style={{ ...otsikkoTyyli, textAlign: 'right' }}>Muutos</th>
            </tr>
          </thead>
          <tbody>
            {muutokset.map((m) => (
              <MuutosRivi key={m.avain} muutos={m} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const otsikkoTyyli = {
  padding:    '8px 12px',
  textAlign:  'left',
  fontSize:   '11px',
  fontWeight: 700,
  color:      '#374151',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  borderBottom: '1px solid #e5e7eb',
}

const soluTyyli = {
  padding:      '8px 12px',
  borderBottom: '1px solid #f3f4f6',
  color:        '#111827',
}

function MuutosRivi({ muutos }) {
  const ennen = muutos.ennen != null ? formatoiKulma(muutos.avain, muutos.ennen) : '—'
  const nyt   = muutos.nyt   != null ? formatoiKulma(muutos.avain, muutos.nyt)   : '—'

  let muutosTeksti = '—'
  let vari = '#6b7280'
  let emoji = ''
  if (muutos.muutos != null) {
    const sel = KULMA_SELITTEET[muutos.avain]
    const yks = sel?.yksikko ?? ''
    const merkki = muutos.muutos > 0 ? '+' : ''
    muutosTeksti = `${merkki}${muutos.muutos} ${yks}`
    if (muutos.suunta === 'parannus')  { vari = '#16a34a'; emoji = '📉' }
    if (muutos.suunta === 'pahennus')  { vari = '#dc2626'; emoji = '📈' }
    if (muutos.suunta === 'ennallaan') { vari = '#6b7280'; emoji = '➡' }
  }

  return (
    <tr>
      <td style={soluTyyli}>{muutos.otsikko}</td>
      <td style={{ ...soluTyyli, textAlign: 'right', color: '#6b7280' }}>{ennen}</td>
      <td style={{ ...soluTyyli, textAlign: 'right', fontWeight: 600 }}>{nyt}</td>
      <td style={{ ...soluTyyli, textAlign: 'right', color: vari, fontWeight: 600 }}>
        {emoji} {muutosTeksti}
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// AIKAJANA-VÄLILEHTI
// ─────────────────────────────────────────────────────────────────────────

// Päämittarit joista piirretään aikajana-graafi.
const PAAMITTARIT = [
  'olkapaiden_korkeusero_cm',
  'lantion_kaltevuus_aste',
  'paan_eteen_tyontyminen_cm',
  'olkapaan_eteen_tyontyminen_cm',
]

export function Aikajana({ hoitokayntiId, asiakasId }) {
  const [historia, setHistoria] = useState([])
  const [valittu, setValittu] = useState(null)
  const [lataa, setLataa] = useState(true)

  useEffect(() => {
    if (!asiakasId) return
    let peruttu = false
    setLataa(true)
    haeAsiakkaanAsentokuvaHistoria(asiakasId).then((rivit) => {
      if (peruttu) return
      setHistoria(rivit)
      setLataa(false)
    })
    return () => { peruttu = true }
  }, [asiakasId])

  // Aggregoidut kulmat per käynti, käynnit aikajärjestyksessä (vanhin ensin
  // graafiin)
  const datapisteet = useMemo(() => {
    return historia
      .slice()
      .reverse()
      .map((k) => ({
        hoitokayntiId: k.hoitokayntiId,
        luotu:         k.luotu,
        otsikko:       k.otsikko,
        kulmat:        yhdistaKulmat(k.kuvat),
      }))
  }, [historia])

  if (lataa) return <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Ladataan aikajanaa…</p>
  if (historia.length === 0) {
    return <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Ei asentokuvia tällä asiakkaalla.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Käyntilista */}
      <div style={{
        background:   'white',
        border:       '1px solid #e5e7eb',
        borderRadius: '10px',
        overflow:     'hidden',
      }}>
        <h4 style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         '#374151',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          padding:       '10px 14px',
          margin:        0,
          borderBottom:  '1px solid #f3f4f6',
        }}>
          Käynnit ({historia.length})
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {historia.map((k) => {
            const onTama = k.hoitokayntiId === hoitokayntiId
            const onValittu = k.hoitokayntiId === valittu
            return (
              <li
                key={k.hoitokayntiId}
                onClick={() => setValittu(onValittu ? null : k.hoitokayntiId)}
                style={{
                  padding:      '8px 14px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor:       'pointer',
                  background:   onValittu ? '#eff6ff' : (onTama ? '#fef3c7' : 'transparent'),
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'space-between',
                  gap:          '8px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', color: '#111827', fontWeight: 600 }}>
                    {muotoiloKayntiNimi(k)}
                  </span>
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>
                    {Object.keys(k.kuvat).length} / 4 kuvaa
                    {onTama && ' · tämä käynti'}
                  </span>
                </div>
                <span style={{ fontSize: '14px', color: onValittu ? '#3b82f6' : '#9ca3af' }}>
                  {onValittu ? '▼' : '▶'}
                </span>
              </li>
            )
          })}
        </ul>
        {valittu && (
          <div style={{ padding: '12px 14px', background: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
            <KayntikuvaPikkukuvat kaynti={historia.find((h) => h.hoitokayntiId === valittu)} />
          </div>
        )}
      </div>

      {/* Viivagraafit */}
      {datapisteet.length >= 2 && (
        <div style={{
          background:   'white',
          border:       '1px solid #e5e7eb',
          borderRadius: '10px',
          padding:      '12px 14px',
        }}>
          <h4 style={{
            fontSize:      '11px',
            fontWeight:    700,
            color:         '#374151',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            margin:        '0 0 12px 0',
          }}>
            Pää-mittareiden kehitys
          </h4>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap:                 '12px',
          }}>
            {PAAMITTARIT.map((avain) => (
              <ViivagraafiKulmasta key={avain} avain={avain} datapisteet={datapisteet} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KayntikuvaPikkukuvat({ kaynti }) {
  if (!kaynti) return null
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap:                 '6px',
    }}>
      {NAKOKULMAT.map((n) => (
        <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{
            aspectRatio:  '3/4',
            background:   kaynti.kuvat[n.id]?.kuva_data ? 'transparent' : '#f9fafb',
            border:       kaynti.kuvat[n.id]?.kuva_data ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
            borderRadius: '6px',
            overflow:     'hidden',
          }}>
            {kaynti.kuvat[n.id]?.kuva_data ? (
              <KuvaLuurangolla kuva={kaynti.kuvat[n.id]} alt={n.nimi} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9ca3af' }}>
                –
              </div>
            )}
          </div>
          <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', fontWeight: 600 }}>
            {n.nimi}
          </span>
        </div>
      ))}
    </div>
  )
}

// Pieni SVG-viivagraafi yksittäisen kulman ajalliselle kehitykselle.
function ViivagraafiKulmasta({ avain, datapisteet }) {
  const sel = KULMA_SELITTEET[avain]
  // Kerää datapisteet joilla on arvo
  const pts = datapisteet
    .map((d, i) => ({ i, x: i, y: d.kulmat[avain], luotu: d.luotu }))
    .filter((p) => typeof p.y === 'number' && isFinite(p.y))
  if (pts.length < 2) {
    return (
      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{sel?.otsikko ?? avain}</div>
        Ei riittävästi mittauksia
      </div>
    )
  }
  const W = 220, H = 80, P = 8
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 0)
  const yRange = (yMax - yMin) || 1
  const xRange = (xMax - xMin) || 1
  const sx = (x) => P + ((x - xMin) / xRange) * (W - 2 * P)
  const sy = (y) => H - P - ((y - yMin) / yRange) * (H - 2 * P)
  const polyline = pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')
  // Nollalinja jos välillä
  const nollaY = yMin <= 0 && yMax >= 0 ? sy(0) : null

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
        {sel?.otsikko ?? avain}
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {nollaY != null && (
          <line x1={P} y1={nollaY} x2={W - P} y2={nollaY} stroke="#e5e7eb" strokeDasharray="3 3" />
        )}
        <polyline
          points={polyline}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        {pts.map((p, idx) => (
          <circle
            key={idx}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r="3"
            fill="#3b82f6"
          >
            <title>{`${formatoiKulma(avain, p.y)} (${new Date(p.luotu).toLocaleDateString('fi-FI')})`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
        <span>{new Date(pts[0].luotu).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}</span>
        <span>{new Date(pts[pts.length - 1].luotu).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}</span>
      </div>
    </div>
  )
}
