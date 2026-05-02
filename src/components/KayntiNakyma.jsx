// Read-only modaali yksittäisen suljetun lomakeversion tarkasteluun.
// Käytetään käyntihistoriasta — hoitaja näkee miten asiakas oli silloin.
// Henkilötiedot tulevat asiakkaat-rivistä (nykyiset), lomakedata version
// silloisesta tilasta. Ei muokkausmahdollisuutta.

import { useEffect, useState } from 'react'
import { useOnline } from '../hooks/useOnline'
import { useEscKey } from '../hooks/useEscKey'
import {
  haeLomakeversio,
  haeHoitokayntiVersionPerusteella,
  haeKaynninItsehoito,
  haeHoitokaynti,
  haeHavainnot,
  haeEdellisetMittarit,
  haeKayntienPaivamaarat,
} from '../lib/db'
import { muotoilePvm, muotoilePvmAika } from '../lib/muotoilu'
import { poimiKuvaUrl } from '../lib/lisakentat'

const overlayTyyli = {
  position:   'fixed',
  inset:      0,
  background: 'rgba(0, 0, 0, 0.5)',
  display:    'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding:    '16px',
  zIndex:     1000,
  overflowY:  'auto',
}

const modaaliTyyli = {
  background:   'white',
  borderRadius: '16px',
  width:        '100%',
  maxWidth:     '640px',
  margin:       '32px auto',
  boxShadow:    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  display:      'flex',
  flexDirection: 'column',
}

const headerTyyli = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '16px 20px',
  borderBottom:   '1px solid #f3f4f6',
  position:       'sticky',
  top:            0,
  background:     'white',
  borderRadius:   '16px 16px 0 0',
}

const sulkeTyyli = {
  width:        '44px',
  height:       '44px',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border:       'none',
  background:   'transparent',
  color:        '#6b7280',
  cursor:       'pointer',
  fontSize:     '20px',
}

const sisaltoTyyli = {
  padding:        '20px',
  display:        'flex',
  flexDirection:  'column',
  gap:            '16px',
}

const ryhmaTyyli = {
  background:    '#f9fafb',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '16px 20px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '12px',
}

const ryhmaOtsikko = {
  fontSize:    '13px',
  fontWeight:  700,
  color:       '#374151',
  margin:      0,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '8px',
  borderBottom:  '1px solid #e5e7eb',
}

const riviTyyli = {
  display:      'grid',
  gridTemplateColumns: 'minmax(120px, 0.4fr) 1fr',
  gap:          '12px',
  fontSize:     '14px',
  alignItems:   'baseline',
}

const labelTyyli = { color: '#6b7280', fontSize: '13px' }
const arvoTyyli  = { color: '#111827', fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
const tyhjaTyyli = { color: '#d1d5db', fontStyle: 'italic' }

function Rivi({ label, arvo }) {
  const onTyhja = arvo === null || arvo === undefined || arvo === '' || (Array.isArray(arvo) && arvo.length === 0)
  return (
    <div style={riviTyyli}>
      <span style={labelTyyli}>{label}</span>
      <span style={onTyhja ? tyhjaTyyli : arvoTyyli}>
        {onTyhja ? '—' : Array.isArray(arvo) ? arvo.join(', ') : arvo}
      </span>
    </div>
  )
}

// Kuva-rivi lisäkentille jotka sisältävät base64-kuvadataa (kehonkartta_piirros,
// allekirjoitus jne).
function KuvaRivi({ label, kuvaUrl }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0', borderBottom: '1px dashed #f3f4f6' }}>
      <span style={labelTyyli}>{label}</span>
      <img
        src={kuvaUrl}
        alt={label}
        style={{
          maxWidth:     '100%',
          maxHeight:    '400px',
          objectFit:    'contain',
          borderRadius: '6px',
          border:       '1px solid #e5e7eb',
          background:   '#f9fafb',
        }}
      />
    </div>
  )
}

export default function KayntiNakyma({ lomakeVersioId, asiakas, onSulje }) {
  const [data, setData] = useState({ versio: null, sairaudet: [] })
  const [lataa, setLataa] = useState(true)
  const [virhe, setVirhe] = useState(null)
  const [tulostetaan, setTulostetaan] = useState(false)
  // Pala B9b — PDF tarvitsee tuoreet B-lomakkeen tiedot serveriltä
  const online = useOnline()

  async function tulosta() {
    if (!data.versio) return
    setTulostetaan(true)
    try {
      // Lazy-load: html2pdf.js + jspdf + html2canvas latautuvat vain kun
      // tulostusta oikeasti tarvitaan, eivät app-bundlessa heti alussa.
      const { tulostaKaynti } = await import('../lib/pdf')
      // Pala B6 + B7: hae käyntiin liitetyt itsehoito-valinnat ja
      // B-lomakkeen täydet tiedot (havainnot, mittarit, hoitoraportti).
      const hoitokayntiId = await haeHoitokayntiVersionPerusteella(lomakeVersioId)
      const [itsehoitoValinnat, hoitokaynti, havainnot, edellisetMittarit, historia] = hoitokayntiId
        ? await Promise.all([
            haeKaynninItsehoito(hoitokayntiId),
            haeHoitokaynti(hoitokayntiId),
            haeHavainnot(hoitokayntiId),
            haeEdellisetMittarit(asiakas?.id, hoitokayntiId),
            haeKayntienPaivamaarat(asiakas?.id),
          ])
        : [[], null, [], null, []]
      // Tämän käynnin kayntinumero — etsi historian listalta version id:llä
      const kayntinumero = (historia ?? []).find((h) => h.id === lomakeVersioId)?.kayntinumero ?? null
      await tulostaKaynti({
        asiakas,
        versio:    data.versio,
        sairaudet: data.sairaudet,
        hoitokaynti,
        havainnot,
        edellisetMittarit,
        itsehoitoValinnat,
        kayntinumero,
      })
    } catch (e) {
      console.error('PDF-tulostus epäonnistui:', e)
      alert('PDF-tulostus epäonnistui: ' + (e.message ?? 'tuntematon virhe'))
    } finally {
      setTulostetaan(false)
    }
  }

  useEffect(() => {
    let peruttu = false
    setLataa(true)
    haeLomakeversio(lomakeVersioId)
      .then((tulos) => {
        if (peruttu) return
        setData(tulos)
        setLataa(false)
      })
      .catch((e) => {
        if (peruttu) return
        setVirhe(e.message ?? 'Lataus epäonnistui')
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [lomakeVersioId])

  // VB3 — yhteinen Esc-hook stable-referenssillä
  useEscKey(onSulje)

  const v     = data.versio
  const lisat = v?.lisakentat ?? {}
  const allekirjoitus = lisat.allekirjoitus ?? null
  const otsikko = (() => {
    const pvm = v?.voimassa_alkaen ? muotoilePvm(v.voimassa_alkaen) : null
    const perusotsikko = pvm ? `Käynti ${pvm}` : 'Käynti'
    return v?.otsikko ? `${perusotsikko} — ${v.otsikko}` : perusotsikko
  })()

  return (
    <div style={overlayTyyli} onClick={onSulje} role="dialog" aria-modal="true">
      <div style={modaaliTyyli} onClick={(e) => e.stopPropagation()}>
        <div style={headerTyyli}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
              {otsikko}
            </h2>
            {v?.voimassa_asti && (
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                Suljettu: {muotoilePvmAika(v.voimassa_asti)}
              </p>
            )}
          </div>
          <button type="button" onClick={onSulje} style={sulkeTyyli} aria-label="Sulje">✕</button>
        </div>

        <div style={sisaltoTyyli}>
          {lataa && (
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
              Ladataan käyntiä…
            </p>
          )}
          {virhe && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', color: '#991b1b', fontSize: '13px' }}>
              Lataus epäonnistui: {virhe}
            </div>
          )}

          {!lataa && !virhe && v && (
            <>
              {/* Käynnin meta — otsikko jos on annettu */}
              {v?.otsikko && (
                <div style={{ ...ryhmaTyyli, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <Rivi label="Käynnin otsikko" arvo={v.otsikko} />
                </div>
              )}

              {/* Henkilötiedot — asiakkaat-rivistä (nykyiset) */}
              <div style={ryhmaTyyli}>
                <h3 style={ryhmaOtsikko}>Henkilötiedot</h3>
                <Rivi label="Nimi"          arvo={asiakas?.nimi} />
                <Rivi label="Sähköposti"    arvo={asiakas?.sahkoposti} />
                <Rivi label="Puhelin"       arvo={asiakas?.puhelin} />
                <Rivi label="Syntymäaika"   arvo={muotoilePvm(asiakas?.syntymaaika)} />
                <Rivi label="Osoite"        arvo={[
                  asiakas?.lahiosoite,
                  [asiakas?.postinumero, asiakas?.postitoimipaikka].filter(Boolean).join(' '),
                ].filter(Boolean).join(', ') || null} />
                <Rivi label="Ammatti"       arvo={asiakas?.ammatti} />
                <Rivi label="Pituus"        arvo={asiakas?.pituus ? `${asiakas.pituus} cm` : null} />
                <Rivi label="Paino"         arvo={asiakas?.paino ? `${asiakas.paino} kg` : null} />
                <Rivi label="Harrastukset"  arvo={v?.harrastukset || lisat.harrastukset} />
              </div>

              {/* Terveys */}
              <div style={ryhmaTyyli}>
                <h3 style={ryhmaOtsikko}>Terveys</h3>
                <Rivi label="Sairaudet"        arvo={data.sairaudet.map((s) => s.nimi)} />
                <Rivi label="Lääkitys"         arvo={v?.laakitys} />
                <Rivi label="Diagnoosit"       arvo={v?.diagnosoidut_sairaudet} />
                <Rivi label="Vammat / huomiot" arvo={v?.vammat_huomiot} />
              </div>

              {/* Hoitoon tulon syy */}
              {(v?.hoitoon_syy || v?.kipu_taso !== null) && (
                <div style={ryhmaTyyli}>
                  <h3 style={ryhmaOtsikko}>Hoitoon tulon syy</h3>
                  <Rivi label="Oireet ja tilanne" arvo={v?.hoitoon_syy} />
                  {v?.kipu_taso !== null && v?.kipu_taso !== undefined && (
                    <Rivi label="Kipuluku" arvo={`${v.kipu_taso} / 10`} />
                  )}
                </div>
              )}

              {/* Suostumukset */}
              <div style={ryhmaTyyli}>
                <h3 style={ryhmaOtsikko}>Suostumukset</h3>
                <Rivi label="GDPR hyväksytty"
                      arvo={asiakas?.suostumus_tietojen_sailytys === true ? 'Kyllä' :
                            asiakas?.suostumus_tietojen_sailytys === false ? 'Ei' : null} />
                <Rivi label="Lupa luovutukseen"
                      arvo={asiakas?.suostumus_tietojen_luovutus === true ? 'Kyllä' :
                            asiakas?.suostumus_tietojen_luovutus === false ? 'Ei' : null} />
                {allekirjoitus && allekirjoitus.startsWith('data:image') && (
                  <div>
                    <p style={{ ...labelTyyli, marginBottom: '6px' }}>Allekirjoitus</p>
                    <img
                      src={allekirjoitus}
                      alt="Asiakkaan allekirjoitus"
                      style={{
                        maxWidth:     '300px',
                        maxHeight:    '120px',
                        background:   '#fafafa',
                        border:       '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding:      '4px',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Lisätiedot */}
              {Object.keys(lisat).filter((k) => k !== 'allekirjoitus' && k !== 'harrastukset').length > 0 && (
                <div style={ryhmaTyyli}>
                  <h3 style={ryhmaOtsikko}>Lisätiedot</h3>
                  {Object.entries(lisat)
                    .filter(([k]) => k !== 'allekirjoitus' && k !== 'harrastukset')
                    .map(([k, val]) => {
                      if (val === null || val === undefined || val === '') return null
                      const kuvaUrl = poimiKuvaUrl(val)
                      if (kuvaUrl) {
                        return <KuvaRivi key={k} label={k.replace(/_/g, ' ')} kuvaUrl={kuvaUrl} />
                      }
                      const naytettava = typeof val === 'object' ? JSON.stringify(val) : String(val)
                      return <Rivi key={k} label={k.replace(/_/g, ' ')} arvo={naytettava} />
                    })}
                </div>
              )}

              {/* Tulosta PDF -nappi */}
              <button
                type="button"
                onClick={tulosta}
                disabled={tulostetaan || !online}
                title={!online ? 'PDF-tulostus vaatii verkkoyhteyden' : ''}
                style={{
                  width:        '100%',
                  padding:      '12px 16px',
                  marginTop:    '4px',
                  minHeight:    '44px',
                  borderRadius: '10px',
                  border:       '1px solid #e2e8f0',
                  background:   'white',
                  color:        '#374151',
                  fontSize:     '14px',
                  fontWeight:   500,
                  cursor:       !online ? 'not-allowed' : tulostetaan ? 'wait' : 'pointer',
                  opacity:      !online || tulostetaan ? 0.6 : 1,
                }}
              >
                {!online ? '🛜 Tulosta hoitokertomus (vaatii verkon)'
                  : tulostetaan ? 'Luodaan PDF…'
                  : '📄 Tulosta hoitokertomus'}
              </button>

              {/* Meta */}
              <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right', margin: 0 }}>
                {v.voimassa_alkaen && `Alkanut: ${muotoilePvmAika(v.voimassa_alkaen)}`}
                {v.muokkaaja_rooli && ` · ${v.muokkaaja_rooli}`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
