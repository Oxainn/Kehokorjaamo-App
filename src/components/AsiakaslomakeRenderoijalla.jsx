// Tuotantokomponentti: lataa oletuspohjan, renderöi lomakkeen, tallentaa Supabaseen.
// Käytetään App.jsx:n näkymissä 'kaynti' (olemassa olevaan asiakkaaseen) ja 'uusi-kaynti' (uusi asiakas).
//
// HUOM: Tätä komponenttia EI saa käyttää vahvistamattomille asiakkaille
// (asiakas.vahvistettu === false) — heille on UudenAsiakkaanTarkistus-näkymä.
// Tällä komponentilla on aina LomakeRenderoija + "Lähetä lomake" -nappi joka
// luo uuden lomakeversion ja sulkee aiemmat. Vahvistamattoman asiakkaan
// kohdalla tämä korvasi asiakkaan jo täyttämän alkuperäisen tiedon
// tyhjällä versiolla — siksi App.jsx ohjaa nyt vahvistamattomat suoraan
// UudenAsiakkaanTarkistus:een.
import { useState, useEffect, useMemo } from 'react'
import { haeOletusLomakepohjaId, tallennaRenderoijastaLomake, haeAsiakkaanViimeisinLomake, haeKayntienPaivamaarat, haeLomakeversio, haeAsiakkaanKontraindikaatiot, haeAsiakkaanKayntienMaara, haeHoitosarjanPituus } from '../lib/db'
import { kokoaVastaukset } from '../lib/lomakeTallennus'
import { useLomakepohja } from '../hooks/useLomakepohja'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'
import Kayntihistoria from './Kayntihistoria'
import ArkistoiNappi from './ArkistoiNappi'

// Suostumukset annetaan vain ensimmäisellä kerralla (julkinen lomake → asiakkaat-
// taulun boolean-sarakkeet). Olemassa olevan, suostumuksensa antaneen asiakkaan
// hoitokäyntilomakkeesta nämä piilotetaan jotta hoitajan ei tarvitse ohittaa
// niitä joka kerralla. Suostumukset näkyvät edelleen UudenAsiakkaanTarkistus-
// näkymässä jossa hoitaja tarkistaa uusia asiakkaita.
function suodataSuostumusOsio(rakenne) {
  if (!rakenne) return rakenne
  const osiot = (rakenne.osiot ?? []).filter((osio) => {
    if (osio.id === 'suostumukset') return false
    const otsikko = typeof osio.otsikko === 'object' ? osio.otsikko?.fi : osio.otsikko
    if (typeof otsikko === 'string' && otsikko.toLowerCase().includes('suostumus')) return false
    return true
  })
  return { ...rakenne, osiot }
}

const TILA = {
  TYHJA:        'tyhja',
  TALLENTAA:    'tallentaa',
  ONNISTUI:     'onnistui',
  EPAONNISTUI:  'epaonnistui',
}

const ilmoitusTyyli = (sävy) => ({
  background:   sävy === 'tieto' ? '#eff6ff' : sävy === 'onnistui' ? '#ecfdf5' : '#fef2f2',
  border:       sävy === 'tieto' ? '1px solid #93c5fd' : sävy === 'onnistui' ? '1px solid #6ee7b7' : '1px solid #fecaca',
  color:        sävy === 'tieto' ? '#1e3a8a' : sävy === 'onnistui' ? '#065f46' : '#991b1b',
  borderRadius: '12px',
  padding:      '12px 16px',
  fontSize:     '13px',
  lineHeight:   1.5,
})

export default function AsiakaslomakeRenderoijalla({ asiakas = null, onValmis = () => {} }) {
  const [pohjaId,    setPohjaId]    = useState(null)
  const [vastaukset, setVastaukset] = useState({})
  const [otsikko,    setOtsikko]    = useState('')
  const [tila,       setTila]       = useState(TILA.TYHJA)
  const [virheviesti, setVirheviesti] = useState(null)
  const [pohjaVirhe, setPohjaVirhe] = useState(null)

  useEffect(() => {
    let peruttu = false
    haeOletusLomakepohjaId()
      .then((id) => {
        if (peruttu) return
        if (!id) setPohjaVirhe('Oletuspohjaa ei löytynyt — luo lomakepohja Asetuksissa.')
        else setPohjaId(id)
      })
      .catch((e) => { if (!peruttu) setPohjaVirhe(e.message ?? 'Pohjan haku epäonnistui') })
    return () => { peruttu = true }
  }, [])

  // Esitäyttö: kun avataan olemassa oleva asiakas, kerää nykyinen lomakedata
  // (asiakkaat-rivi + voimassa oleva lomakeversio + sairaudet) ja täytä
  // renderöijän kentät. Tämä mahdollistaa lomakkeen päivittämisen ajan
  // mittaan eikä joka tallennus tyhjästä.
  const asiakasId = asiakas?.id ?? asiakas?.supabase_id ?? null

  // Pala B2: kontraindikaatio-varoitus asiakaskortin yläosaan
  const [kontraindikaatiot, setKontraindikaatiot] = useState([])
  useEffect(() => {
    if (!asiakasId) { setKontraindikaatiot([]); return }
    let peruttu = false
    haeAsiakkaanKontraindikaatiot(asiakasId).then((lista) => {
      if (!peruttu) setKontraindikaatiot(lista)
    })
    return () => { peruttu = true }
  }, [asiakasId])

  // Pala B6.5: sarjan etenemis-indikaattori "Sarja: N/M hoitokertaa tehty"
  const [sarjaTila, setSarjaTila] = useState({ tehty: 0, pituus: null })
  useEffect(() => {
    if (!asiakasId) { setSarjaTila({ tehty: 0, pituus: null }); return }
    let peruttu = false
    Promise.all([
      haeAsiakkaanKayntienMaara(asiakasId),
      haeHoitosarjanPituus(),
    ]).then(([tehty, pituus]) => {
      if (!peruttu) setSarjaTila({ tehty, pituus })
    })
    return () => { peruttu = true }
  }, [asiakasId])
  useEffect(() => {
    if (!asiakasId) {
      setVastaukset({})
      setOtsikko('')
      return
    }
    let peruttu = false
    haeAsiakkaanViimeisinLomake(asiakasId)
      .then(({ versio, sairausIdit }) => {
        if (peruttu) return
        setVastaukset(kokoaVastaukset(asiakas, versio, sairausIdit))
        setOtsikko(versio?.otsikko ?? '')
      })
      .catch((e) => {
        if (peruttu) return
        console.warn('[AsiakaslomakeRenderoijalla] Esitäyttö epäonnistui:', e)
        // Jätä vastaukset tyhjäksi — käyttäjä voi täyttää kentät manuaalisesti
        setVastaukset(kokoaVastaukset(asiakas, null, []))
        setOtsikko('')
      })
    return () => { peruttu = true }
  }, [asiakasId])

  async function tallenna(arvot) {
    setTila(TILA.TALLENTAA)
    setVirheviesti(null)
    try {
      const tulos = await tallennaRenderoijastaLomake({
        vastaukset:           arvot,
        asiakasIdJosOlemassa: asiakas?.id ?? null,
        otsikko,
      })
      if (tulos.virhe) {
        setTila(TILA.EPAONNISTUI)
        setVirheviesti(tulos.virhe)
        return
      }
      setTila(TILA.ONNISTUI)
      // 2 sekunnin viive: pidempi kuin alkuperäinen 1.2 s jotta nopealla
      // yhteydellä mobiilikäyttäjä ehtii rekisteröidä onnistumisviestin.
      setTimeout(onValmis, 2000)
    } catch (e) {
      setTila(TILA.EPAONNISTUI)
      // Verkkovirhe: TypeError ("Failed to fetch") tai navigator.onLine = false.
      // Lomakkeen tila säilyy state:ssa, käyttäjä voi yrittää uudestaan kun
      // yhteys palaa.
      const onVerkkovirhe =
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        e instanceof TypeError
      setVirheviesti(onVerkkovirhe
        ? 'Verkkoyhteys puuttuu. Tarkista yhteys ja yritä uudestaan — lomakkeen tietoja ei vielä tallennettu.'
        : (e.message ?? 'Tuntematon virhe'))
    }
  }

  const onUusiAsiakas = !asiakas?.id

  const [tulostetaan, setTulostetaan] = useState(false)
  async function tulostaGDPR() {
    if (!asiakas?.id) return
    setTulostetaan(true)
    try {
      // Lazy-load PDF-kirjasto — html2pdf.js + jspdf + html2canvas
      // latautuvat vain kun tulostusta oikeasti tarvitaan.
      const { tulostaTietopaketti } = await import('../lib/pdf')
      // Hae KAIKKI asiakkaan käynnit — voimassa olevat + suljetut.
      // Käytetään kahta erillistä kyselyä: nykyinen + historia.
      const [nykyinenTulos, historia] = await Promise.all([
        haeAsiakkaanViimeisinLomake(asiakas.id),
        haeKayntienPaivamaarat(asiakas.id),
      ])
      const kaikkiVersiot = []
      if (nykyinenTulos?.versio) {
        kaikkiVersiot.push({
          versio:    nykyinenTulos.versio,
          sairaudet: nykyinenTulos.sairaudet ?? [],
        })
      }
      // Hae vanhojen versioiden tarkemmat tiedot rinnakkaisesti
      const vanhatTulokset = await Promise.all(
        (historia ?? []).map((h) => haeLomakeversio(h.id))
      )
      for (const t of vanhatTulokset) {
        if (t?.versio) kaikkiVersiot.push(t)
      }
      // Järjestä uusin ensin (voimassa olevassa ei ole voimassa_alkaen-aikaa
      // joka olisi suurempi, mutta päivämäärän mukaan järjestäminen on ok).
      kaikkiVersiot.sort((a, b) => {
        const ad = a.versio?.voimassa_alkaen ?? a.versio?.luotu ?? ''
        const bd = b.versio?.voimassa_alkaen ?? b.versio?.luotu ?? ''
        return bd.localeCompare(ad)
      })

      await tulostaTietopaketti({ asiakas, kaynnit: kaikkiVersiot })
    } catch (e) {
      console.error('Tietopaketin luonti epäonnistui:', e)
      alert('Tietopaketin luonti epäonnistui: ' + (e.message ?? 'tuntematon virhe'))
    } finally {
      setTulostetaan(false)
    }
  }

  // Lataa pohja paikallisesti jotta voimme suodattaa Suostumukset-osion
  // pois ennen kuin LomakeRenderoija saa rakenteen.
  const { rakenne: pohjaRakenne, kentat: pohjaKentat, lataa: lataaPohja, virhe: pohjaLatausVirhe } = useLomakepohja(pohjaId)

  const onSuostumusAnnettu = asiakas?.suostumus_tietojen_sailytys === true
  const naytettavaRakenne = useMemo(
    () => onSuostumusAnnettu ? suodataSuostumusOsio(pohjaRakenne) : pohjaRakenne,
    [pohjaRakenne, onSuostumusAnnettu]
  )

  if (pohjaVirhe) {
    return <div style={ilmoitusTyyli('virhe')}>{pohjaVirhe}</div>
  }
  if (!pohjaId || lataaPohja) {
    return <div style={{ padding: '24px', color: '#6b7280', fontSize: '14px' }}>Ladataan lomakepohjaa…</div>
  }
  if (pohjaLatausVirhe) {
    return <div style={ilmoitusTyyli('virhe')}>Lomakepohjan lataus epäonnistui: {pohjaLatausVirhe}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Pala B6.5 — sarjan etenemis-indikaattori asiakaskortin yläosassa */}
      {sarjaTila.tehty > 0 && (
        <div style={{
          background:    sarjaTila.pituus && sarjaTila.tehty >= sarjaTila.pituus ? '#fffbeb' : '#f0fdf4',
          border:        sarjaTila.pituus && sarjaTila.tehty >= sarjaTila.pituus ? '1px solid #fcd34d' : '1px solid #bbf7d0',
          borderRadius:  '10px',
          padding:       '8px 14px',
          fontSize:      '13px',
          color:         '#374151',
          display:       'flex',
          alignItems:    'center',
          gap:           '6px',
        }}>
          <span>📊</span>
          <span>
            <strong>Sarja:</strong>{' '}
            {sarjaTila.pituus
              ? (sarjaTila.tehty > sarjaTila.pituus
                  ? `${sarjaTila.pituus}/${sarjaTila.pituus} sarja päättynyt + ${sarjaTila.tehty - sarjaTila.pituus} ylläpitokäyntiä`
                  : `${sarjaTila.tehty}/${sarjaTila.pituus} hoitokertaa tehty`)
              : `${sarjaTila.tehty} hoitokerta${sarjaTila.tehty === 1 ? '' : 'a'} tehty`}
          </span>
        </div>
      )}

      {/* Pala B2 — kontraindikaatio-varoitus yläosassa, punaisella jos asiakkaalla
          on rastittu yksi tai useampi sairaus jolla on kontraindikaatio=true. */}
      {kontraindikaatiot.length > 0 && (
        <div style={{
          background:    '#fef2f2',
          border:        '1.5px solid #dc2626',
          borderRadius:  '12px',
          padding:       '14px 18px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '4px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
            ⚠️ Kontraindikaatio — harkitse hoidon soveltuvuutta
          </p>
          <p style={{ fontSize: '14px', color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
            {kontraindikaatiot.join(' · ')}
          </p>
        </div>
      )}

      {tila === TILA.TALLENTAA && (
        <div style={ilmoitusTyyli('tieto')}>Tallennetaan…</div>
      )}
      {tila === TILA.ONNISTUI && (
        <div style={ilmoitusTyyli('onnistui')}>
          <strong>✓ Lomake tallennettu.</strong> Palataan rekisteriin…
        </div>
      )}
      {tila === TILA.EPAONNISTUI && (
        <div style={ilmoitusTyyli('virhe')}>
          <strong>✗ Tallennus epäonnistui</strong>
          <p style={{ margin: '4px 0 0 0' }}>{virheviesti}</p>
        </div>
      )}

      {/* Käynnin otsikko — vapaaehtoinen, max 50 merkkiä. Näytetään
          käyntipillereissä ja KayntiNakyma-modaalin otsikossa. */}
      <div style={{
        background:    'white',
        border:        '1px solid #e2e8f0',
        borderRadius:  '12px',
        padding:       '14px 16px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '6px',
      }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          Käynnin otsikko
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>(valinnainen)</span>
        </label>
        <input
          type="text"
          value={otsikko}
          onChange={(e) => setOtsikko(e.target.value.slice(0, 50))}
          maxLength={50}
          placeholder="esim. Niskakipu, alkuhoito"
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            padding:      '10px 12px',
            borderRadius: '10px',
            border:       '1.5px solid #e2e8f0',
            fontSize:     '14px',
            color:        '#111827',
            outline:      'none',
            background:   'white',
            fontFamily:   'inherit',
          }}
        />
        {otsikko.length >= 40 && (
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            {otsikko.length}/50 merkkiä
          </p>
        )}
      </div>

      {/* Lähetys-nappi näkyy LomakeRenderoija:n sisällä vain uudelle asiakkaalle.
          Olemassa olevalle näytetään erillinen "Tallenna muutokset"-nappi
          alempana — "LÄHETÄ LOMAKE" -termi viittaa ensimmäiseen tallennukseen,
          ei muokkaukseen. */}
      <LomakeRenderoija
        valmiitTiedot={{ rakenne: naytettavaRakenne, kentat: pohjaKentat }}
        vastaukset={vastaukset}
        onMuutos={setVastaukset}
        onLahetys={onUusiAsiakas ? tallenna : null}
      />

      {/* Tallenna muutokset -nappi olemassa olevan asiakkaan muokkauksessa */}
      {!onUusiAsiakas && (
        <button
          type="button"
          onClick={() => tallenna(vastaukset ?? {})}
          disabled={tila === TILA.TALLENTAA}
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
            cursor:       tila === TILA.TALLENTAA ? 'wait' : 'pointer',
            opacity:      tila === TILA.TALLENTAA ? 0.7 : 1,
          }}
        >
          {tila === TILA.TALLENTAA ? 'Tallennetaan…' : 'Tallenna muutokset'}
        </button>
      )}

      {/* Käyntihistoria — näytetään vain jos asiakkaalla on suljettuja versioita */}
      {asiakas && <Kayntihistoria asiakas={asiakas} />}

      {/* GDPR-tietopaketti — vain olemassa olevalle asiakkaalle */}
      {asiakas?.id && (
        <button
          type="button"
          onClick={tulostaGDPR}
          disabled={tulostetaan}
          style={{
            width:        '100%',
            padding:      '12px 16px',
            marginTop:    '12px',
            borderRadius: '10px',
            border:       '1px solid #e2e8f0',
            background:   'white',
            color:        '#374151',
            fontSize:     '14px',
            fontWeight:   500,
            cursor:       tulostetaan ? 'wait' : 'pointer',
            opacity:      tulostetaan ? 0.7 : 1,
          }}
        >
          {tulostetaan ? 'Luodaan PDF…' : '📄 Tulosta tietopaketti (GDPR)'}
        </button>
      )}

      {/* Arkistoi-nappi — vain olemassa olevalle asiakkaalle (ei uusi-käynti-näkymässä) */}
      {asiakas?.id && <ArkistoiNappi asiakas={asiakas} onArkistoitu={onValmis} />}
    </div>
  )
}
