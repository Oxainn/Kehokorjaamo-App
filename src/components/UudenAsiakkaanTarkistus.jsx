// Vahvistamattoman uuden asiakkaan tarkistusnäkymä.
//
// Näyttää asiakkaan julkisen lomakkeen kautta täyttämät tiedot read-only
// -yhteenvetona, eikä lataa LomakeRenderoija:a — tämä estää regression
// jossa hoitajan klikkaus "Lähetä lomake" -nappia tallensi tyhjän
// version asiakkaan alkuperäisen päälle (sulki sen voimassa_asti-kentällä
// ja loi uuden NULL-rivin).
//
// "Tallenna asiakas" -nappi vahvistaa asiakkaan (asiakkaat.vahvistettu = true).
// Lomakeversiota ei luoda eikä muokata vahvistuksen yhteydessä — alkuperäinen
// jää voimassa olevaksi.

import { useState, useEffect } from 'react'
import { haeAsiakkaanViimeisinLomake, vahvistaAsiakas } from '../lib/db'
import { muotoilePvm, muotoilePvmAika } from '../lib/muotoilu'

const ilmoitusTyyli = (sävy) => ({
  background:   sävy === 'tieto' ? '#eff6ff' : sävy === 'onnistui' ? '#ecfdf5' : '#fef2f2',
  border:       sävy === 'tieto' ? '1px solid #93c5fd' : sävy === 'onnistui' ? '1px solid #6ee7b7' : '1px solid #fecaca',
  color:        sävy === 'tieto' ? '#1e3a8a' : sävy === 'onnistui' ? '#065f46' : '#991b1b',
  borderRadius: '12px',
  padding:      '12px 16px',
  fontSize:     '13px',
  lineHeight:   1.5,
})

const ryhmaTyyli = {
  background:    'white',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '20px',
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
  borderBottom:  '1px solid #f3f4f6',
}

const riviTyyli = {
  display:      'grid',
  gridTemplateColumns: 'minmax(120px, 0.4fr) 1fr',
  gap:          '12px',
  fontSize:     '14px',
  alignItems:   'baseline',
}

const labelTyyli = {
  color:      '#6b7280',
  fontSize:   '13px',
}

const arvoTyyli = {
  color:      '#111827',
  fontWeight: 500,
  whiteSpace: 'pre-wrap',
  wordBreak:  'break-word',
}

const tyhjaTyyli = {
  color:      '#d1d5db',
  fontStyle:  'italic',
}

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


export default function UudenAsiakkaanTarkistus({ asiakas, onValmis }) {
  const [lomake,  setLomake]  = useState({ versio: null, sairaudet: [] })
  const [lataa,   setLataa]   = useState(true)
  const [virhe,   setVirhe]   = useState(null)
  const [tila,    setTila]    = useState('idle') // idle | tallentaa | onnistui | virhe
  const [tilaViesti, setTilaViesti] = useState(null)

  const asiakasId = asiakas?.id ?? asiakas?.supabase_id ?? null

  useEffect(() => {
    if (!asiakasId) { setLataa(false); return }
    let peruttu = false
    haeAsiakkaanViimeisinLomake(asiakasId)
      .then((tulos) => {
        if (peruttu) return
        setLomake(tulos)
        setLataa(false)
      })
      .catch((e) => {
        if (peruttu) return
        setVirhe(e.message ?? 'Lomakkeen lataus epäonnistui')
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [asiakasId])

  async function vahvista() {
    if (!asiakasId) return
    setTila('tallentaa')
    setTilaViesti(null)
    const tulos = await vahvistaAsiakas(asiakasId)
    if (tulos.virhe) {
      setTila('virhe')
      setTilaViesti(tulos.virhe)
      return
    }
    setTila('onnistui')
    setTimeout(onValmis, 2000)
  }

  if (lataa) {
    return <div style={{ padding: '24px', color: '#6b7280', fontSize: '14px' }}>Ladataan asiakkaan tietoja…</div>
  }

  if (virhe) {
    return <div style={ilmoitusTyyli('virhe')}>Lataus epäonnistui: {virhe}</div>
  }

  const v        = lomake.versio
  const lisat    = v?.lisakentat ?? {}
  const allekirjoitus = lisat.allekirjoitus ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Korostettu palkki + Tallenna-nappi ylhäällä */}
      <div style={{
        background:    '#fffbeb',
        border:        '1.5px solid #f59e0b',
        borderRadius:  '12px',
        padding:       '16px 20px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '12px',
      }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
            🔔 Uusi asiakas — odottaa vahvistusta
          </p>
          <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
            Asiakas täytti lomakkeen julkisen linkin kautta. Tarkista alla olevat tiedot ja paina
            "Tallenna asiakas" lisätäksesi hänet asiakaslistaan. Tiedot pysyvät tallessa — tämä
            näkymä ei muokkaa lomaketta.
          </p>
        </div>
        {tila === 'onnistui' ? (
          <div style={ilmoitusTyyli('onnistui')}>
            <strong>✓ Asiakas tallennettu.</strong> Palataan rekisteriin…
          </div>
        ) : (
          <button
            type="button"
            onClick={vahvista}
            disabled={tila === 'tallentaa'}
            style={{
              width:        '100%',
              minHeight:    '52px',
              borderRadius: '12px',
              border:       'none',
              background:   '#1D9E75',
              color:        'white',
              fontSize:     '15px',
              fontWeight:   700,
              letterSpacing: '0.03em',
              cursor:       tila === 'tallentaa' ? 'wait' : 'pointer',
              opacity:      tila === 'tallentaa' ? 0.7 : 1,
            }}
          >
            {tila === 'tallentaa' ? 'Tallennetaan…' : '✓ Tallenna asiakas'}
          </button>
        )}
        {tila === 'virhe' && tilaViesti && (
          <div style={ilmoitusTyyli('virhe')}>
            Vahvistus epäonnistui: {tilaViesti}
          </div>
        )}
      </div>

      {/* Henkilötiedot — asiakkaat-rivistä */}
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
        <Rivi label="Sairaudet"        arvo={lomake.sairaudet.map((s) => s.nimi)} />
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
            <Rivi label="Kipuluku nyt" arvo={`${v.kipu_taso} / 10`} />
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

      {/* Lisäkentät — yleiskatsaus jos lomakkeessa on muita kuin standardikenttiä */}
      {Object.keys(lisat).filter((k) => k !== 'allekirjoitus' && k !== 'harrastukset').length > 0 && (
        <div style={ryhmaTyyli}>
          <h3 style={ryhmaOtsikko}>Lisätiedot</h3>
          {Object.entries(lisat)
            .filter(([k]) => k !== 'allekirjoitus' && k !== 'harrastukset')
            .map(([k, val]) => {
              if (val === null || val === undefined || val === '') return null
              const naytettava = typeof val === 'object' ? JSON.stringify(val) : String(val)
              return <Rivi key={k} label={k.replace(/_/g, ' ')} arvo={naytettava} />
            })}
        </div>
      )}

      {/* Meta */}
      {v?.luotu && (
        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right', margin: 0 }}>
          Lomake täytetty: {muotoilePvmAika(v.luotu)}
          {v.muokkaaja_rooli && ` · ${v.muokkaaja_rooli}`}
        </p>
      )}

      {/* Jos lomakeversiota ei löytynyt — hyvin harvinainen reunatapaus */}
      {!v && (
        <div style={ilmoitusTyyli('virhe')}>
          Asiakkaalle ei löytynyt lomakeversiota. Tämä voi tarkoittaa että rivi tallentui
          puutteellisesti tai versio on suljettu vahingossa. Voit silti vahvistaa asiakkaan
          ja täyttää lomakkeen myöhemmin.
        </div>
      )}
    </div>
  )
}
