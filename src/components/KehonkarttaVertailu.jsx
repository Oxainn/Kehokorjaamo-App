// Vaihe B Pala B6.6 — Asiakkaan kehonkartta hoitajan vertailutietona
//
// Renderöi 3 välilehteä Hoitokirjaus-näkymän HAVAINNOT-kortissa:
//   1. Asiakkaan oireet — A-lomakkeen kehonkartta-merkinnät tekstilistana
//   2. Hoitajan havainnot — BodyMap (B-lomakkeen löydökset)
//   3. Vertailu — yhteneväiset / hiljaiset jännitykset / vain asiakkaan oireet
//
// Pala B+ -laajennuksena tulee graafinen yhdistelmäkartta. Tähän palaan
// riittää tekstilista — visualisoi jo päättelyt ja antaa hoitajalle
// käytännön työkalun.

import { useState } from 'react'
import BodyMap from './BodyMap'
import { KEHON_VYOHYKKEET } from '../data/kehonVyohykkeet'
import { KIRJAUSRAKENNE } from '../data/findings-structure'

// Heuristinen mappaus hoitajan KIRJAUSRAKENNE-alueista asiakkaan
// kehonvyöhykkeiden avainsanoihin. Jos vyöhykkeen nimi sisältää näiden
// avainsanojen mukaan tunnusmerkkejä, alueet matchaavat.
const ALUE_AVAINSANAT = {
  lantio:      ['lantio', 'risti', 'pakara'],
  'si-nivel':  ['si-', 'ristisuoliluu', 'risti'],
  polvi:       ['polvi'],
  nilkka:      ['nilkka', 'kantaluu'],
  jalkaktera:  ['jalkapöytä', 'kantaluu', 'kantapää'],
  hartiat:     ['hartia', 'olkaluu', 'lapaluu', 'yläselkä', 'olka'],
  paa:         ['pää', 'niska', 'kallo', 'kaularank'],
  selkaranka:  ['selkä', 'rintarank', 'lannerank', 'kaularank'],
}

// Oiretyyppien suomenkieliset nimet + värit (sama logiikka kuin
// Osio4Kehonkartta:ssa).
const OIRETYYPIT = {
  kipu:          { nimi: 'Kipu',          vari: '#ef4444' },
  lihasjannitys: { nimi: 'Lihasjännitys', vari: '#f97316' },
  puutuminen:    { nimi: 'Puutuminen',    vari: '#3b82f6' },
  tunnottomuus:  { nimi: 'Tunnottomuus',  vari: '#9ca3af' },
}

// Etsi hoitajan KIRJAUSRAKENNE-alue jonka avainsanat osuvat vyöhykkeen
// nimeen. Palauttaa { alueId, alueNimi } tai null jos ei löytynyt.
function vyohykeMatchaa(vyohyke) {
  if (!vyohyke?.nimi) return null
  const nimiAlempi = vyohyke.nimi.toLowerCase()
  const tekninenAlempi = vyohyke.tekninen?.toLowerCase() ?? ''
  for (const [alueId, sanat] of Object.entries(ALUE_AVAINSANAT)) {
    for (const sana of sanat) {
      if (nimiAlempi.includes(sana) || tekninenAlempi.includes(sana)) {
        const alue = KIRJAUSRAKENNE.find((a) => a.id === alueId)
        return { alueId, alueNimi: alue?.nimi ?? alueId }
      }
    }
  }
  return null
}

const tabTyyli = (aktiivinen) => ({
  padding:      '8px 14px',
  borderBottom: aktiivinen ? '2px solid #1D9E75' : '2px solid transparent',
  background:   'transparent',
  border:       'none',
  borderRadius: 0,
  color:        aktiivinen ? '#1D9E75' : '#6b7280',
  fontSize:     '13px',
  fontWeight:   600,
  cursor:       'pointer',
  marginBottom: '-1px',
})

const ryhmaListaTyyli = {
  background:    '#f9fafb',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '12px 16px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '6px',
  marginTop:     '8px',
}

const oireRivi = {
  display:    'flex',
  alignItems: 'center',
  gap:        '8px',
  padding:    '6px 0',
  fontSize:   '13px',
}

function OiretyyppiPilleri({ tyyppi }) {
  const o = OIRETYYPIT[tyyppi] ?? { nimi: tyyppi, vari: '#9ca3af' }
  return (
    <span style={{
      fontSize:     '11px',
      padding:      '2px 8px',
      borderRadius: '999px',
      background:   `${o.vari}1a`,
      color:        o.vari,
      fontWeight:   500,
      whiteSpace:   'nowrap',
    }}>
      {o.nimi}
    </span>
  )
}

// Asiakkaan oireet -lista vyöhykkeittäin
function AsiakkaanOireet({ merkinnat }) {
  const rivit = Object.entries(merkinnat ?? {})
    .map(([vyohykeId, oireet]) => {
      const vy = KEHON_VYOHYKKEET.find((v) => v.id === vyohykeId)
      if (!vy) return null
      const arr = Array.isArray(oireet) ? oireet : (typeof oireet === 'string' ? [oireet] : [])
      if (arr.length === 0) return null
      return { vyohyke: vy, oireet: arr }
    })
    .filter(Boolean)

  if (rivit.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', padding: '12px 0' }}>
        Asiakas ei ole merkinnyt oireita kehonkarttaan.
      </p>
    )
  }

  return (
    <div style={ryhmaListaTyyli}>
      {rivit.map(({ vyohyke, oireet }) => (
        <div key={vyohyke.id} style={oireRivi}>
          <span style={{ flex: 1, color: '#111827' }}>
            <strong>{vyohyke.nimi}</strong>
            {vyohyke.tekninen && <span style={{ color: '#9ca3af', fontSize: '12px' }}> · {vyohyke.tekninen}</span>}
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {oireet.map((o, i) => <OiretyyppiPilleri key={`${o}-${i}`} tyyppi={o} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function VertailuListat({ asiakkaanMerkinnat, hoitajanHavainnot }) {
  // Käännä asiakkaan merkinnät → joukko aluiId:ä joihin asiakas on
  // merkinnyt oireita, mukaan lukien itse vyöhykkeet
  const asiakkaanRivit = Object.entries(asiakkaanMerkinnat ?? {})
    .map(([vyohykeId, oireet]) => {
      const vy = KEHON_VYOHYKKEET.find((v) => v.id === vyohykeId)
      if (!vy) return null
      const arr = Array.isArray(oireet) ? oireet : (typeof oireet === 'string' ? [oireet] : [])
      if (arr.length === 0) return null
      const matchaus = vyohykeMatchaa(vy)
      return { vyohyke: vy, oireet: arr, matchaus }
    })
    .filter(Boolean)

  // Joukko hoitajan alueIDejä havainnoista
  const hoitajanAlueet = new Set((hoitajanHavainnot ?? []).map((h) => h.alueId))

  // Yhteneväiset: asiakkaan merkintä jolle löytyy matching-alue jossa
  // hoitaja on tehnyt havainnon
  const yhteneväiset = asiakkaanRivit.filter((r) => r.matchaus && hoitajanAlueet.has(r.matchaus.alueId))

  // Vain asiakkaan oireet: asiakkaan merkintä jolle hoitajalla EI ole
  // havaintoa (joko ei matchausta tai matchaus on alueeseen jossa
  // hoitaja ei merkinnyt mitään)
  const vainAsiakas = asiakkaanRivit.filter((r) => !r.matchaus || !hoitajanAlueet.has(r.matchaus.alueId))

  // Hiljaiset jännitykset: hoitajan havainto-alueet joille ei ole
  // matching-vyöhykettä asiakkaan merkinnöissä
  const matchatutAlueet = new Set(asiakkaanRivit.map((r) => r.matchaus?.alueId).filter(Boolean))
  const hiljaiset = (hoitajanHavainnot ?? []).filter((h) => !matchatutAlueet.has(h.alueId))

  function Lohko({ otsikko, kuvaus, lista, vari, tyhjaTeksti, lohkoSisalto }) {
    return (
      <div style={{
        background:    `${vari}0d`,
        border:        `1px solid ${vari}66`,
        borderRadius:  '12px',
        padding:       '14px 18px',
        marginBottom:  '10px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: vari, margin: '0 0 4px' }}>
          {otsikko} ({lista.length})
        </p>
        {kuvaus && (
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px', lineHeight: 1.4 }}>{kuvaus}</p>
        )}
        {lista.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>{tyhjaTeksti}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lista.map(lohkoSisalto)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <Lohko
        otsikko="✓ Yhteneväiset alueet"
        kuvaus="Asiakas tuntee oireita ja hoitaja löytää poikkeamia samalta alueelta — vahvistus."
        vari="#15803d"
        lista={yhteneväiset}
        tyhjaTeksti="Ei yhteneväisiä alueita."
        lohkoSisalto={(r) => (
          <div key={r.vyohyke.id} style={{ fontSize: '13px', color: '#111827' }}>
            <strong>{r.vyohyke.nimi}</strong> ↔ <span style={{ color: '#374151' }}>{r.matchaus.alueNimi}</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
              {r.oireet.map((o, i) => <OiretyyppiPilleri key={`${o}-${i}`} tyyppi={o} />)}
            </div>
          </div>
        )}
      />

      <Lohko
        otsikko="🔍 Hiljaiset jännitykset"
        kuvaus="Hoitaja löytää poikkeamia, mutta asiakas ei ole merkinnyt alueelle oireita. Voit kysyä asiakkaalta tunteeko hän tähänkin."
        vari="#1d4ed8"
        lista={hiljaiset}
        tyhjaTeksti="Ei hiljaisia jännityksiä."
        lohkoSisalto={(h) => (
          <div key={h.alueId} style={{ fontSize: '13px', color: '#111827' }}>
            <strong>{h.alueNimi}</strong>
            {h.kipu > 0 && <span style={{ color: '#6b7280', fontSize: '12px' }}> · VAS {h.kipu}/10</span>}
            {Object.entries(h.kirjaukset ?? {})
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([k, v]) => (
                <span key={k} style={{ color: '#6b7280', fontSize: '12px', marginLeft: '6px' }}>· {k}: {v}</span>
              ))}
          </div>
        )}
      />

      <Lohko
        otsikko="❤️ Asiakkaan oireet ilman löydöstä"
        kuvaus="Asiakas tuntee oireita mutta hoitaja ei ole tehnyt löydöstä alueelta. Tarkista vielä ennen lopetusta."
        vari="#b91c1c"
        lista={vainAsiakas}
        tyhjaTeksti="Ei tällaisia tilanteita."
        lohkoSisalto={(r) => (
          <div key={r.vyohyke.id} style={{ fontSize: '13px', color: '#111827' }}>
            <strong>{r.vyohyke.nimi}</strong>
            {r.matchaus && <span style={{ color: '#9ca3af', fontSize: '12px' }}> (alue: {r.matchaus.alueNimi})</span>}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
              {r.oireet.map((o, i) => <OiretyyppiPilleri key={`${o}-${i}`} tyyppi={o} />)}
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default function KehonkarttaVertailu({
  asiakkaanKehonkartta,    // { merkinnat, vedot, hahmo } | null
  hoitajanHavainnotInit,   // BodyMap:n esitäyttö (pre-merkityt löydökset objektina)
  hoitajanHavainnot,       // ajantasaiset löydökset taulukkona [{ alueId, alueNimi, kipu, kirjaukset, tyyppi }]
  onHavainnotMuutos,
}) {
  const [tab, setTab] = useState('asiakas')
  const merkinnat = asiakkaanKehonkartta?.merkinnat ?? {}
  const onMerkintoja = Object.keys(merkinnat).length > 0

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
        <button type="button" onClick={() => setTab('asiakas')} style={tabTyyli(tab === 'asiakas')}>
          Asiakkaan oireet {onMerkintoja ? `(${Object.keys(merkinnat).length})` : ''}
        </button>
        <button type="button" onClick={() => setTab('hoitaja')} style={tabTyyli(tab === 'hoitaja')}>
          Hoitajan havainnot
        </button>
        <button type="button" onClick={() => setTab('vertailu')} style={tabTyyli(tab === 'vertailu')}>
          Vertailu
        </button>
      </div>

      {tab === 'asiakas' && <AsiakkaanOireet merkinnat={merkinnat} />}

      {tab === 'hoitaja' && (
        <BodyMap
          piilotaAnalysoi
          initialFindings={hoitajanHavainnotInit ?? undefined}
          onChange={onHavainnotMuutos}
        />
      )}

      {tab === 'vertailu' && (
        <VertailuListat
          asiakkaanMerkinnat={merkinnat}
          hoitajanHavainnot={hoitajanHavainnot}
        />
      )}
    </div>
  )
}
