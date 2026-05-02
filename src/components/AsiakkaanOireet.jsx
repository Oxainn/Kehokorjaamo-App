// Asiakkaan oireet -näkymä — visuaalinen yhteenveto + ryhmitelty lista
// + vertailu aiempiin käynteihin.
//
// Korvaa nykyisen pitkän litteän listan (KehonkarttaVertailu.jsx:n sisäinen
// AsiakkaanOireet-funktio) kolmiosaisella näkymällä:
//   OSA 1 — yhteenveto: kompakti kehonkartta-piirros + 4 top-laatikkoa + tulkinta
//   OSA 2 — suodatin + ryhmitelty accordion-lista anatomisten alueiden mukaan
//   OSA 3 — vertailu aiempiin käynteihin: aikajana + muutos-listat + graafi

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { KEHON_VYOHYKKEET } from '../data/kehonVyohykkeet'

// Oiretyypit — synkattu Osio4Kehonkartta:n / KehonkarttaVertailu:n kanssa
const OIRETYYPIT = {
  kipu:          { nimi: 'Kipu',          vari: '#ef4444', emoji: '🔴' },
  lihasjannitys: { nimi: 'Lihasjännitys', vari: '#f97316', emoji: '🟠' },
  puutuminen:    { nimi: 'Puutuminen',    vari: '#3b82f6', emoji: '🟡' },
  tunnottomuus:  { nimi: 'Tunnottomuus',  vari: '#9ca3af', emoji: '⚪' },
}

// Anatomiset ryhmät — vyöhykkeet jaetaan näiden mukaan (avainsana-matchaus
// vyöhykkeen nimestä). Järjestys = renderöintijärjestys.
const RYHMAT = [
  { id: 'niska',     nimi: 'Niska & kaula',                avainsanat: ['niska', 'kaula', 'takaraivo', 'pää', 'otsa', 'leuka'] },
  { id: 'ylaselka',  nimi: 'Selkä — yläosa & hartiat',     avainsanat: ['lapaluu', 'yläselkä', 'olkapää', 'olkapaa', 'hartia'] },
  { id: 'alaselka',  nimi: 'Selkä — alaosa & lanneranka',  avainsanat: ['keskiselkä', 'lannelihas', 'alaselkä', 'lanneranka', 'risti', 'sij'] },
  { id: 'ylaraajat', nimi: 'Yläraajat',                    avainsanat: ['olkavarsi', 'kyynärpää', 'kyynärvarsi', 'käsi', 'sormi', 'ranne'] },
  { id: 'lantio',    nimi: 'Lantio & vatsa',               avainsanat: ['lantio', 'pakara', 'lonkka', 'vatsa', 'asis', 'rinta'] },
  { id: 'alaraajat', nimi: 'Alaraajat',                    avainsanat: ['reisi', 'polvi', 'sääri', 'saari', 'nilkka', 'jalkaterä', 'jalkatera', 'kantaluu', 'pohje', 'akilles', 'holvi'] },
]

// Etsi vyöhykkeen anatominen ryhmä avainsana-matchauksella.
function vyohykkeenRyhma(vyohyke) {
  if (!vyohyke?.nimi) return null
  const nimi = vyohyke.nimi.toLowerCase()
  const tek = (vyohyke.tekninen ?? '').toLowerCase()
  for (const r of RYHMAT) {
    if (r.avainsanat.some((s) => nimi.includes(s) || tek.includes(s))) return r.id
  }
  return null  // ei matchia → "Muut"
}

const muotoilePvm = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const muotoilePvmLyhyt = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
}

// Litistää merkinnat-objektin → [{ vyohyke, oireet }] -lista.
function litistaMerkinnat(merkinnat) {
  return Object.entries(merkinnat ?? {})
    .map(([vyohykeId, oireet]) => {
      const vy = KEHON_VYOHYKKEET.find((v) => v.id === vyohykeId)
      if (!vy) return null
      const arr = Array.isArray(oireet) ? oireet : (typeof oireet === 'string' ? [oireet] : [])
      if (arr.length === 0) return null
      return { vyohyke: vy, oireet: arr }
    })
    .filter(Boolean)
}

export default function AsiakkaanOireet({ asiakasId, kehonkartta }) {
  // Nykyinen merkinnät-objekti voi tulla joko propina (KehonkarttaVertailussa
  // se haetaan jo aiemmin) tai meidän pitää hakea se täältä lomakehistoriasta.
  const merkinnat = kehonkartta?.merkinnat ?? {}
  const rivit = useMemo(() => litistaMerkinnat(merkinnat), [merkinnat])

  // Top-N-laskenta per oiretyyppi
  const topPerOire = useMemo(() => {
    const tulos = {}
    for (const tyyppi of Object.keys(OIRETYYPIT)) {
      tulos[tyyppi] = rivit.filter((r) => r.oireet.includes(tyyppi))
    }
    return tulos
  }, [rivit])

  // Sääntöpohjainen tulkinta
  const tulkinta = useMemo(() => generoiTulkinta(topPerOire), [topPerOire])

  // OSA 2: suodatin + ryhmittely
  const [suodatin, setSuodatin] = useState('kaikki')

  const ryhmitelty = useMemo(() => {
    const haku = suodatin === 'kaikki' ? rivit : rivit.filter((r) => r.oireet.includes(suodatin))
    const ryhmiin = {}
    for (const r of haku) {
      const ryhmaId = vyohykkeenRyhma(r.vyohyke) ?? 'muut'
      if (!ryhmiin[ryhmaId]) ryhmiin[ryhmaId] = []
      ryhmiin[ryhmaId].push(r)
    }
    return ryhmiin
  }, [rivit, suodatin])

  if (rivit.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', padding: '12px 0' }}>
        Asiakas ei ole merkinnyt oireita kehonkarttaan.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* OSA 1 — yhteenveto */}
      <Yhteenveto kehonkartta={kehonkartta} rivit={rivit} topPerOire={topPerOire} tulkinta={tulkinta} />

      {/* OSA 2 — suodatin + ryhmitelty lista */}
      <RyhmiteltyOsio ryhmitelty={ryhmitelty} suodatin={suodatin} setSuodatin={setSuodatin} topPerOire={topPerOire} />

      {/* OSA 3 — vertailu aiempiin käynteihin */}
      {asiakasId && <VertailuOsio asiakasId={asiakasId} nykyisetMerkinnat={merkinnat} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 1 — yhteenveto: kompakti kehonkartta + top-laatikot + tulkinta
// ─────────────────────────────────────────────────────────────────────────

function Yhteenveto({ kehonkartta, rivit, topPerOire, tulkinta }) {
  return (
    <div style={{
      display:        'grid',
      gridTemplateColumns: 'minmax(180px, 1fr) minmax(280px, 2fr)',
      gap:            '16px',
      alignItems:     'start',
    }}>
      {/* Kehonkartta vasemmalla */}
      <div style={{
        background:    '#f9fafb',
        border:        '1px solid #e5e7eb',
        borderRadius:  '12px',
        padding:       '12px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
          Asiakkaan oma merkintä
        </p>
        <KompaktiKehonkartta merkinnat={kehonkartta?.merkinnat ?? {}} />
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' }}>
          {rivit.length} aluetta merkitty
        </p>
      </div>

      {/* Top-laatikot oikealla */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                 '8px',
        }}>
          {Object.entries(OIRETYYPIT).map(([tyyppi, meta]) => (
            <TopLaatikko
              key={tyyppi}
              tyyppi={tyyppi}
              meta={meta}
              rivit={topPerOire[tyyppi] ?? []}
            />
          ))}
        </div>

        {tulkinta && (
          <div style={{
            background:   '#fffbeb',
            border:       '1px solid #fcd34d',
            borderRadius: '10px',
            padding:      '10px 14px',
            fontSize:     '12px',
            color:        '#78350f',
            lineHeight:   1.5,
          }}>
            💡 {tulkinta}
          </div>
        )}
      </div>
    </div>
  )
}

function TopLaatikko({ tyyppi, meta, rivit }) {
  const top3 = rivit.slice(0, 3)
  const muut = rivit.length - top3.length
  return (
    <div style={{
      background:   `${meta.vari}0d`,
      border:       `1px solid ${meta.vari}66`,
      borderRadius: '10px',
      padding:      '10px 12px',
    }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: meta.vari, margin: '0 0 6px' }}>
        {meta.emoji} {meta.nimi.toUpperCase()} ({rivit.length})
      </p>
      {rivit.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>—</p>
      ) : (
        <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
          {top3.map((r, i) => (
            <li key={`${r.vyohyke.id}-${i}`}>{r.vyohyke.nimi}</li>
          ))}
        </ol>
      )}
      {muut > 0 && (
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0', paddingLeft: '18px' }}>
          + {muut} muuta
        </p>
      )}
    </div>
  )
}

function generoiTulkinta(topPerOire) {
  const osat = []
  for (const [tyyppi, meta] of Object.entries(OIRETYYPIT)) {
    const lista = topPerOire[tyyppi] ?? []
    if (lista.length === 0) continue
    const top1 = lista[0]?.vyohyke?.nimi
    if (!top1) continue
    if (lista.length >= 3) {
      osat.push(`paljon ${meta.nimi.toLowerCase()}a (${lista.length} aluetta), eniten ${top1}`)
    } else {
      osat.push(`${meta.nimi.toLowerCase()}a ${top1}`)
    }
  }
  if (osat.length === 0) return null
  return osat.join(', ').replace(/, ([^,]*)$/, ' ja $1') + '.'
}

// Kompakti SVG-kehonkartta — 4 hahmoa pienoiskoossa, jokaisessa väritetyt
// pisteet niissä vyöhykkeissä joihin asiakas on merkinnyt oireita.
function KompaktiKehonkartta({ merkinnat }) {
  const merkityt = useMemo(() => {
    return Object.entries(merkinnat ?? {})
      .map(([vyohykeId, oireet]) => {
        const vy = KEHON_VYOHYKKEET.find((v) => v.id === vyohykeId)
        const arr = Array.isArray(oireet) ? oireet : (typeof oireet === 'string' ? [oireet] : [])
        if (!vy || arr.length === 0) return null
        // Käytä ensimmäistä oiretta värivalintaan (jos useita, kipu prioriteettina)
        const ensisijainen = ['kipu', 'lihasjannitys', 'puutuminen', 'tunnottomuus'].find((t) => arr.includes(t)) ?? arr[0]
        return { vy, vari: OIRETYYPIT[ensisijainen]?.vari ?? '#9ca3af' }
      })
      .filter(Boolean)
  }, [merkinnat])

  return (
    <svg viewBox="0 0 1471 1069" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <image href="/hahmokuvat.svg" x="0" y="0" width="1471" height="1069" />
      {merkityt.map(({ vy, vari }) => (
        <circle
          key={vy.id}
          cx={vy.cx}
          cy={vy.cy}
          r={18}
          fill={vari}
          fillOpacity={0.6}
          stroke={vari}
          strokeWidth={3}
        />
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 2 — Suodatin + ryhmitelty lista
// ─────────────────────────────────────────────────────────────────────────

function RyhmiteltyOsio({ ryhmitelty, suodatin, setSuodatin, topPerOire }) {
  const [avoinnaRyhmat, setAvoinnaRyhmat] = useState(() => new Set(RYHMAT.map((r) => r.id).concat('muut')))

  const togglRyhma = (id) => {
    setAvoinnaRyhmat((prev) => {
      const u = new Set(prev)
      if (u.has(id)) u.delete(id)
      else u.add(id)
      return u
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Suodatin */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <SuodatinNappi nimi="Kaikki" maara={Object.values(ryhmitelty).reduce((s, l) => s + l.length, 0)} valittu={suodatin === 'kaikki'} onValitse={() => setSuodatin('kaikki')} />
        {Object.entries(OIRETYYPIT).map(([tyyppi, meta]) => (
          <SuodatinNappi
            key={tyyppi}
            nimi={`${meta.emoji} ${meta.nimi}`}
            maara={topPerOire[tyyppi]?.length ?? 0}
            valittu={suodatin === tyyppi}
            vari={meta.vari}
            onValitse={() => setSuodatin(tyyppi)}
          />
        ))}
      </div>

      {/* Ryhmät */}
      {[...RYHMAT, { id: 'muut', nimi: 'Muut' }].map((ryhma) => {
        const lista = ryhmitelty[ryhma.id] ?? []
        if (lista.length === 0) return null
        const auki = avoinnaRyhmat.has(ryhma.id)
        return (
          <div key={ryhma.id} style={{
            background:   'white',
            border:       '1px solid #e5e7eb',
            borderRadius: '10px',
            overflow:     'hidden',
          }}>
            <button
              type="button"
              onClick={() => togglRyhma(ryhma.id)}
              style={{
                width:        '100%',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                padding:      '10px 14px',
                background:   auki ? '#f9fafb' : 'white',
                border:       'none',
                cursor:       'pointer',
                fontSize:     '13px',
                fontWeight:   600,
                color:        '#374151',
              }}
            >
              <span>{auki ? '▼' : '▶'} {ryhma.nimi} ({lista.length})</span>
            </button>
            {auki && (
              <div style={{ padding: '6px 14px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lista.map((r) => (
                  <div key={r.vyohyke.id} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '8px',
                    padding:      '6px 0',
                    borderBottom: '1px dashed #f3f4f6',
                    fontSize:     '13px',
                  }}>
                    <span style={{ flex: 1, color: '#111827' }}>
                      <strong>{r.vyohyke.nimi}</strong>
                      {r.vyohyke.tekninen && <span style={{ color: '#9ca3af', fontSize: '11px' }}> · {r.vyohyke.tekninen}</span>}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {r.oireet.map((o, i) => <OirePilleri key={`${o}-${i}`} tyyppi={o} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SuodatinNappi({ nimi, maara, valittu, onValitse, vari = '#6b7280' }) {
  return (
    <button
      type="button"
      onClick={onValitse}
      style={{
        padding:      '4px 10px',
        borderRadius: '999px',
        border:       valittu ? `1.5px solid ${vari}` : '1px solid #e5e7eb',
        background:   valittu ? `${vari}1a` : 'white',
        color:        valittu ? vari : '#6b7280',
        fontSize:     '11px',
        fontWeight:   valittu ? 700 : 500,
        cursor:       'pointer',
      }}
    >
      {nimi} {maara > 0 && `· ${maara}`}
    </button>
  )
}

function OirePilleri({ tyyppi }) {
  const meta = OIRETYYPIT[tyyppi] ?? { nimi: tyyppi, vari: '#9ca3af' }
  return (
    <span style={{
      fontSize:     '10px',
      padding:      '2px 8px',
      borderRadius: '999px',
      background:   `${meta.vari}1a`,
      color:        meta.vari,
      fontWeight:   500,
    }}>
      {meta.nimi}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 3 — Vertailu aiempiin käynteihin
// ─────────────────────────────────────────────────────────────────────────

function VertailuOsio({ asiakasId, nykyisetMerkinnat }) {
  const [historia, setHistoria] = useState(null)
  const [valittuVertailu, setValittuVertailu] = useState(null)  // versioId vai null = automaattinen edellinen

  useEffect(() => {
    let peruttu = false
    ;(async () => {
      const { data } = await supabase
        .from('asiakastietolomake_versiot')
        .select('id, versio_nro, voimassa_alkaen, voimassa_asti, lisakentat')
        .eq('asiakas_id', asiakasId)
        .order('voimassa_alkaen', { ascending: false })
      if (peruttu) return
      setHistoria(data ?? [])
    })()
    return () => { peruttu = true }
  }, [asiakasId])

  if (!historia) {
    return <p style={{ fontSize: '12px', color: '#9ca3af' }}>Ladataan historiaa…</p>
  }

  // Erotetaan nykyinen (voimassa_asti = NULL) ja aiemmat
  const nykyinen = historia.find((h) => h.voimassa_asti === null)
  const aiemmat = historia.filter((h) => h.voimassa_asti !== null)

  if (aiemmat.length === 0) {
    return (
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
          📈 Muutokset edellisistä käynneistä
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          Ei aiempaa käyntiä — tämä on ensimmäinen kerta. Vertailu näkyy seuraavalla kerralla.
        </p>
      </div>
    )
  }

  // Aikajana — kaikki versiot oikealta vasemmalle (oikealla = nyt)
  const aikajana = [...aiemmat].reverse().concat(nykyinen ? [nykyinen] : [])

  // Default-vertailu: edellinen käynti (= aiemmat[0])
  const vertailtava = valittuVertailu
    ? historia.find((h) => h.id === valittuVertailu)
    : aiemmat[0]

  const muutokset = vertailtava ? laskeMuutokset(vertailtava.lisakentat?.kehonkartta_piirros?.merkinnat ?? {}, nykyisetMerkinnat) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        📈 Muutokset edellisistä käynneistä
      </p>

      {/* Aikajana */}
      <div style={{
        display:        'flex',
        gap:            '8px',
        overflowX:      'auto',
        padding:        '8px 4px',
        alignItems:     'center',
      }}>
        {aikajana.map((h, i) => {
          const onNyt = h.voimassa_asti === null
          const valittu = vertailtava?.id === h.id
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => !onNyt && setValittuVertailu(h.id)}
              disabled={onNyt}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            '4px',
                padding:        '8px 12px',
                background:     onNyt ? '#16a34a' : valittu ? '#1d4ed8' : '#f3f4f6',
                color:          onNyt || valittu ? 'white' : '#374151',
                border:         valittu ? '2px solid #1d4ed8' : '1px solid #e5e7eb',
                borderRadius:   '8px',
                cursor:         onNyt ? 'default' : 'pointer',
                fontSize:       '11px',
                minWidth:       '80px',
                whiteSpace:     'nowrap',
              }}
            >
              <span style={{ fontSize: '14px' }}>●</span>
              <span style={{ fontWeight: 600 }}>{onNyt ? 'NYT' : `Käynti ${i + 1}`}</span>
              <span style={{ opacity: 0.85 }}>{muotoilePvmLyhyt(h.voimassa_alkaen)}</span>
            </button>
          )
        })}
      </div>

      {/* Muutos-listat */}
      {muutokset && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <MuutosLohko nimi="📈 Parantuneet" lista={muutokset.parantuneet} vari="#16a34a" tyhjaTeksti="Ei parannuksia tähän käyntiin." />
          <MuutosLohko nimi="📉 Pahentuneet" lista={muutokset.pahentuneet} vari="#dc2626" tyhjaTeksti="Ei uusia oireita." />
          <MuutosLohko nimi="➡ Ennallaan"   lista={muutokset.ennallaan}   vari="#6b7280" tyhjaTeksti="Ei samoja oireita." />
        </div>
      )}

      {/* Yksinkertainen viivagraafi: oireiden määrä per käynti */}
      <KipuGraafi historia={historia} />
    </div>
  )
}

function MuutosLohko({ nimi, lista, vari, tyhjaTeksti }) {
  return (
    <div style={{
      background:   `${vari}0d`,
      border:       `1px solid ${vari}66`,
      borderRadius: '10px',
      padding:      '10px 12px',
    }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: vari, margin: '0 0 6px' }}>
        {nimi} ({lista.length})
      </p>
      {lista.length === 0 ? (
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>{tyhjaTeksti}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {lista.map((m, i) => (
            <li key={`${m.vyohykeId}-${i}`} style={{ fontSize: '12px', color: '#374151' }}>
              • <strong>{m.nimi}</strong>
              {m.muutos && <span style={{ color: '#6b7280', fontSize: '11px' }}> · {m.muutos}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Vertaa kahta merkinnat-objektia ja luokittele:
//   parantuneet — alueet joissa oire poistui tai vakavuus väheni
//   pahentuneet — alueet joissa uusi oire ilmestyi tai vakavuus kasvoi
//   ennallaan   — alueet jotka molemmissa, samat oireet
function laskeMuutokset(aiemmat, nyt) {
  // Vakavuusjärjestys: tunnottomuus > puutuminen > kipu > lihasjannitys
  // (ei oikeasti hierarkkinen, mutta käytetään muutos-päättelyyn)
  const vakavuus = (oireet) => {
    if (oireet.includes('tunnottomuus')) return 4
    if (oireet.includes('puutuminen')) return 3
    if (oireet.includes('kipu')) return 2
    if (oireet.includes('lihasjannitys')) return 1
    return 0
  }

  const kaikkiAlueet = new Set([...Object.keys(aiemmat), ...Object.keys(nyt)])
  const parantuneet = []
  const pahentuneet = []
  const ennallaan = []

  for (const vyohykeId of kaikkiAlueet) {
    const vy = KEHON_VYOHYKKEET.find((v) => v.id === vyohykeId)
    if (!vy) continue
    const aiOireet = Array.isArray(aiemmat[vyohykeId]) ? aiemmat[vyohykeId] : []
    const nytOireet = Array.isArray(nyt[vyohykeId]) ? nyt[vyohykeId] : []
    const aiVak = vakavuus(aiOireet)
    const nytVak = vakavuus(nytOireet)

    const item = (muutos) => ({ vyohykeId, nimi: vy.nimi, muutos })

    if (aiVak === nytVak && aiOireet.length === nytOireet.length) {
      if (aiVak > 0) ennallaan.push(item(aiOireet.map((o) => OIRETYYPIT[o]?.nimi ?? o).join(', ')))
    } else if (nytVak < aiVak) {
      parantuneet.push(item(`oli ${oireSummary(aiOireet)} → nyt ${oireSummary(nytOireet) || 'ei oiretta'}`))
    } else {
      pahentuneet.push(item(`oli ${oireSummary(aiOireet) || 'ei oiretta'} → nyt ${oireSummary(nytOireet)}`))
    }
  }

  return { parantuneet, pahentuneet, ennallaan }
}

function oireSummary(oireet) {
  if (oireet.length === 0) return ''
  return oireet.map((o) => OIRETYYPIT[o]?.nimi.toLowerCase() ?? o).join(' + ')
}

// Yksinkertainen viivagraafi: oireiden kokonaismäärä per käynti.
function KipuGraafi({ historia }) {
  const data = useMemo(() => {
    return [...historia].reverse().map((h) => {
      const merkinnat = h.lisakentat?.kehonkartta_piirros?.merkinnat ?? {}
      const maara = Object.values(merkinnat).filter((o) => Array.isArray(o) ? o.length > 0 : !!o).length
      return { pvm: h.voimassa_alkaen, maara, onNyt: h.voimassa_asti === null }
    })
  }, [historia])

  if (data.length < 2) return null

  const max = Math.max(...data.map((d) => d.maara), 1)
  const w = 100  // svg-yksikköleveys per piste
  const h = 60

  return (
    <div style={{
      background:   'white',
      border:       '1px solid #e5e7eb',
      borderRadius: '10px',
      padding:      '12px 14px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
        Oireiden määrä ajan myötä
      </p>
      <svg viewBox={`0 0 ${w * data.length} ${h + 20}`} style={{ width: '100%', height: '80px' }}>
        {/* Viiva */}
        <polyline
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="2"
          points={data.map((d, i) => `${i * w + w / 2},${h - (d.maara / max) * h + 10}`).join(' ')}
        />
        {/* Pisteet */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={i * w + w / 2}
              cy={h - (d.maara / max) * h + 10}
              r={4}
              fill={d.onNyt ? '#16a34a' : '#1d4ed8'}
            />
            <text x={i * w + w / 2} y={h + 18} textAnchor="middle" fontSize="9" fill="#6b7280">
              {muotoilePvmLyhyt(d.pvm)}
            </text>
            <text x={i * w + w / 2} y={h - (d.maara / max) * h + 4} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">
              {d.maara}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
