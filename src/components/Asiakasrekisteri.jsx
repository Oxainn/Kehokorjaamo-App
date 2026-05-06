import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { haeKayntienPaivamaarat, haeKontraindikaatiotAsiakkaille, haeArkistoidunMaara, palautaAsiakas, arkistoiAsiakas, poistaAsiakas, haeViimeisinKayntiPalvelulla, haeViimeisinHoitokaynti } from '../lib/db'
import { muotoilePvm, muodostaCSV, lataaTiedosto, jaaNimi } from '../lib/muotoilu'
import KayntiNakyma from './KayntiNakyma'
import KayntiLomakeNakyma from './KayntiLomakeNakyma'
import PikamuokkausModaali from './PikamuokkausModaali'

// Asiakasrekisteri jakautuu kahteen osioon:
//   - "Uudet asiakkaat" (vahvistettu = false) — ylhäällä, korostettuna oranssilla
//     reunalla. Tänne tulevat julkisen lomakkeen kautta saapuneet, jotka
//     odottavat hoitajan tarkistusta ja "Tallenna asiakas" -klikkausta.
//   - "Asiakkaat" (vahvistettu = true) — alla, normaali näkymä.
// Hakukenttä suodattaa molempia osioita yhtaikaa.

// `refresh`-prop: numeerinen avain joka kasvaa kun App.jsx haluaa pakottaa
// asiakaslistan ja käyntipillerien uudelleenladauksen (esim. paluun
// jälkeen "+ Uusi käynti" tai "Tallenna asiakas" -toiminnoista).
//
// `arkistoTila`-prop: jos true, näyttää arkistoidut asiakkaat ja "↺ Palauta"
// -napin. Oletus false näyttää aktiiviset (ei-arkistoidut) asiakkaat.
// `onSiirryArkistoon` / `onTakaisinRekisteriin`: callback-funktiot navigaatioon.
export default function Asiakasrekisteri({
  onValitseAsiakas,
  onAvaaKaynti,           // KIIRE-FIX 6 (D-malli): käynnillisten asiakkaiden klikkaus
  hoitajaId,
  refresh = 0,
  arkistoTila = false,
  onSiirryArkistoon,
  onTakaisinRekisteriin,
}) {
  const [asiakkaat, setAsiakkaat] = useState([])
  const [haku, setHaku]           = useState('')
  const [lataa, setLataa]         = useState(true)
  // Map: asiakkaan id → 4 uusinta käyntiriviä [{ id, voimassa_alkaen }]
  const [kayntienMap, setKayntienMap] = useState({})
  // Map: asiakkaan id → kontraindikaatio-sairauksien nimet (jos yhtään)
  const [kontraindikaatiotMap, setKontraindikaatiotMap] = useState(new Map())
  // Avattu käynti-modaali — { lomakeVersioId, asiakas } tai null
  const [avoinKaynti,   setAvoinKaynti]   = useState(null)
  // Avattu pikamuokkaus-modaali — asiakas-objekti tai null
  const [pikamuokattava, setPikamuokattava] = useState(null)
  // Arkistoitujen asiakkaiden määrä (näkyy normaalin näkymän "🗄 Arkisto (X)" -linkissä)
  const [arkistoMaara, setArkistoMaara] = useState(0)
  // Lokaali "refresh" arkistotilassa kun palautus muuttaa listan
  const [paikallinenRefresh, setPaikallinenRefresh] = useState(0)
  // Asiakkaan id jolle käynnistystä juuri parsitaan — estää tuplaklikkauksen
  const [kaynnistettava, setKaynnistettava] = useState(null)

  useEffect(() => {
    const haeAsiakkaat = async () => {
      if (!hoitajaId) {
        setLataa(false)
        return
      }
      // Suora kysely asiakkaat-tauluun (ei `asiakkaan_nykyinen_lomake`-viewistä)
      // jotta saadaan vahvistettu-sarake mukaan.
      const { data, error } = await supabase
        .from('asiakkaat')
        .select('id, nimi, sahkoposti, puhelin, syntymaaika, luotu, paivitetty, vahvistettu, lahiosoite, postinumero, postitoimipaikka, ammatti, pituus, paino, suostumus_tietojen_sailytys, suostumus_tietojen_luovutus, arkistoitu')
        .eq('hoitaja_id', hoitajaId)
        .eq('arkistoitu', arkistoTila)
        .order('luotu', { ascending: false })
      if (error) {
        setLataa(false)
        return
      }
      const lista = data ?? []
      setAsiakkaat(lista)

      // Hae rinnan: jokaisen asiakkaan 4 viimeisintä käyntipäivää,
      // kontraindikaatiot kaikille asiakkaille kerralla, ja arkistoitujen
      // kokonaismäärä (jälkimmäinen vain normaalitilassa, ei arkistossa).
      const [kayntiTulokset, kontraindikaatiot, arkistoMaaraTulos] = await Promise.all([
        Promise.all(lista.map((a) => haeKayntienPaivamaarat(a.id, 4))),
        haeKontraindikaatiotAsiakkaille(lista.map((a) => a.id)),
        arkistoTila ? Promise.resolve(0) : haeArkistoidunMaara(hoitajaId),
      ])
      const map = {}
      lista.forEach((a, i) => { map[a.id] = kayntiTulokset[i] ?? [] })
      setKayntienMap(map)
      setKontraindikaatiotMap(kontraindikaatiot)
      setArkistoMaara(arkistoMaaraTulos)
      setLataa(false)
    }
    haeAsiakkaat()
  }, [hoitajaId, refresh, arkistoTila, paikallinenRefresh])

  async function palauta(asiakas) {
    const ok = window.confirm(`Palautetaanko ${asiakas.nimi || 'asiakas'} aktiiviseen rekisteriin?`)
    if (!ok) return
    const tulos = await palautaAsiakas(asiakas.id)
    if (tulos.virhe) { alert('Palautus epäonnistui: ' + tulos.virhe); return }
    setPaikallinenRefresh((n) => n + 1)
  }

  // Pala 2.18: arkistoi asiakas — pikanappi rivin lopussa.
  // Pehmeä poisto (asiakkaat.arkistoitu = true), palautettavissa Arkisto-näkymästä.
  async function arkistoi(asiakas) {
    const ok = window.confirm(
      `Arkistoidaanko ${asiakas.nimi || 'asiakas'}?\n\n` +
      `Tiedot säilyvät tallessa, mutta asiakas piiloutuu rekisteristä. ` +
      `Voit palauttaa hänet myöhemmin Arkisto-näkymästä.`
    )
    if (!ok) return
    const tulos = await arkistoiAsiakas(asiakas.id)
    if (tulos.virhe) { alert('Arkistointi epäonnistui: ' + tulos.virhe); return }
    setPaikallinenRefresh((n) => n + 1)
  }

  // Asiakasrivin pääpainikkeen klikkaus.
  //   - Käynnillinen → KIIRE-FIX 6 (D-malli): hae viimeisin hoitokaynti ja
  //     ohjaa onAvaaKaynti-callbackiin → App.jsx avaa LomakeRenderoijan
  //     muokkaustilassa. Jos viimeisin on tilassa 'valmis', UusiKayntiContainer
  //     kutsuu avaaKayntiUudelleen automaattisesti avaaOlemassaKaynti-funktion
  //     kautta. Jos viimeisin on vanha (ei lomakepohja_versio_id:tä) tippuu
  //     kayntejaOlemassa-haarasta uuden käynnin polkuun KIIRE-FIX 2:n
  //     Y-strategialla.
  //   - Käynnitön → uuden käynnin polku, KIIRE-FIX 2:n Y-strategia jos
  //     mahdollista (käynnitön tarkoituksessa "ei valmis-käyntejä jotka
  //     tunnistaisivat palvelun" — ei käytännössä laukea, mutta haaraa pidetään
  //     symmetrisenä jatkokäyttöä varten).
  async function paaPainikkeenKlikkaus(a, kayntejaOlemassa) {
    if (kaynnistettava === a.id) return        // suoja tuplaklikkaukselta
    setKaynnistettava(a.id)
    try {
      if (kayntejaOlemassa) {
        // KIIRE-FIX 6: D-mallin ydin — avaa viimeisin käynti muokkaustilassa
        const { kaynti } = await haeViimeisinHoitokaynti(a.id)
        if (kaynti?.id) {
          onAvaaKaynti?.(a, kaynti.id)
          return
        }
        // Viimeisimmästä puuttuu lomakepohja_versio_id (vanha käynti) tai
        // hakua ei voitu tehdä → fallback uuden käynnin polulle.
        const { palvelu, ohitaPalveluvalinta } = await haeViimeisinKayntiPalvelulla(a.id)
        if (ohitaPalveluvalinta && palvelu) {
          onValitseAsiakas?.(a, palvelu)
          return
        }
      }
      onValitseAsiakas?.(a)
    } finally {
      setKaynnistettava(null)
    }
  }

  // Pala 2.18: pysyvä poisto — vain arkisto-näkymässä saatavilla.
  // CASCADE poistaa hoitokaynnit, lomakeversiot, itsehoito-ohjelman, asentokuvat
  // jne. automaattisesti. Tämä on peruuttamaton.
  async function poistaLopullisesti(asiakas) {
    const ok = window.confirm(
      `⚠ POISTA ASIAKAS LOPULLISESTI?\n\n` +
      `${asiakas.nimi || 'Asiakas'} ja KAIKKI hänen tietonsa (hoitokäynnit, ` +
      `lomakkeet, itsehoito, asentokuvat) poistuvat pysyvästi. ` +
      `Tätä ei voi peruuttaa.\n\n` +
      `Jatketaanko?`
    )
    if (!ok) return
    const tulos = await poistaAsiakas(asiakas.id)
    if (tulos.virhe) { alert('Poisto epäonnistui: ' + tulos.virhe); return }
    setPaikallinenRefresh((n) => n + 1)
  }

  const haetMatchaa = (a) => {
    const h = haku.toLowerCase()
    return (
      a.nimi?.toLowerCase().includes(h) ||
      a.sahkoposti?.toLowerCase().includes(h) ||
      // Puhelinnumero on merkkijono jossa voi olla välilyöntejä — tarkka
      // tekstinhaku ilman lower-casea (puhelimessa ei kirjaimia).
      a.puhelin?.includes(haku.trim())
    )
  }

  const uudet         = asiakkaat.filter((a) => a.vahvistettu === false && haetMatchaa(a))
  const vahvistetut   = asiakkaat.filter((a) => a.vahvistettu !== false && haetMatchaa(a))

  const avatarKirjain = (nimi) =>
    nimi?.trim()?.[0]?.toUpperCase() ?? '?'

  function vieCSV() {
    // Asiakasrekisteri-näkymä näyttää jo aktiiviset (arkistoitu = false), joten
    // suoraan käytettävä asiakkaat-state sisältää vain ne joita halutaan viedä.
    if (asiakkaat.length === 0) return
    const otsikot = [
      'Etunimi', 'Sukunimi', 'Sähköposti', 'Puhelin', 'Syntymäaika',
      'Lähiosoite', 'Postinumero', 'Postitoimipaikka', 'Ammatti',
      'Pituus', 'Paino', 'Luotu', 'Päivitetty',
    ]
    const rivit = asiakkaat.map((a) => {
      const [etunimi, sukunimi] = jaaNimi(a.nimi)
      return [
        etunimi,
        sukunimi,
        a.sahkoposti ?? '',
        a.puhelin ?? '',
        muotoilePvm(a.syntymaaika) ?? '',
        a.lahiosoite ?? '',
        a.postinumero ?? '',
        a.postitoimipaikka ?? '',
        a.ammatti ?? '',
        a.pituus ?? '',
        a.paino ?? '',
        muotoilePvm(a.luotu) ?? '',
        muotoilePvm(a.paivitetty) ?? '',
      ]
    })
    // Erotin ; — Excel suomalaisessa lokaalissa avaa oikein ilman
    // manuaalista import-ohjattua. UTF-8 BOM tarjoaa skandit oikein.
    const csv = muodostaCSV(otsikot, rivit, ';')
    const d = new Date()
    const pvm = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    lataaTiedosto(csv, `asiakkaat-${pvm}.csv`)
  }

  if (lataa) return (
    <div className="lataauspulse" style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280', fontSize: '14px' }}>
      Haetaan asiakkaita…
    </div>
  )

  function AsiakasKortti({ a, korostettu }) {
    const kaynnit = kayntienMap[a.id] ?? []
    const kontraindikaatiot = kontraindikaatiotMap.get(a.id) ?? []
    const onKontraindikaatio = kontraindikaatiot.length > 0
    // Värikoodi: korostettu (uusi asiakas) > kontraindikaatio > normaali
    const taustavari = korostettu ? '#fffbeb' : (onKontraindikaatio ? '#fff7ed' : 'white')
    const reunavari  = korostettu ? '1.5px solid #f59e0b'
                     : onKontraindikaatio ? '1.5px solid #fb923c'
                     : '1px solid #e2e8f0'
    return (
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           '8px',
          padding:       '14px 16px',
          borderRadius:  '12px',
          background:    taustavari,
          border:        reunavari,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: korostettu ? '#fde68a' : '#E1F5EE',
            color:      korostettu ? '#92400e' : '#085041',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', flexShrink: 0,
          }}>
            {avatarKirjain(a.nimi)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nimi || '(nimetön)'}</span>
              {onKontraindikaatio && !korostettu && (
                <span
                  title={`Vaikuttaa hoitoon: ${kontraindikaatiot.join(', ')}`}
                  style={{ fontSize: '14px', color: '#c2410c', flexShrink: 0 }}
                  aria-label={`Varoitus: ${kontraindikaatiot.length} hoitoon vaikuttavaa sairautta`}
                >
                  ⚠️
                </span>
              )}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[a.sahkoposti, a.puhelin].filter(Boolean).join(' · ') || '—'}
            </p>
            {a.luotu && (
              <p style={{ fontSize: '11px', color: korostettu ? '#92400e' : '#9ca3af', margin: '2px 0 0', fontWeight: korostettu ? 500 : 400 }}>
                {korostettu ? `Täyttänyt lomakkeen: ${muotoilePvm(a.luotu)}` : `Lisätty: ${muotoilePvm(a.luotu)}`}
              </p>
            )}
          </div>

          {/* Pikamuokkaus vain vahvistetuille (ei vahvistamattomille eikä arkistossa) */}
          {!arkistoTila && !korostettu && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPikamuokattava(a) }}
              title="Muokkaa yhteystietoja"
              aria-label="Muokkaa yhteystietoja"
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', border: '1px solid #e2e8f0',
                background: 'white', color: '#6b7280', fontSize: '14px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ✎
            </button>
          )}
          {/* Pala 2.18: 🗄 arkistoi vahvistetut aktiiviset (ei vahvistamattomille) */}
          {!arkistoTila && !korostettu && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); arkistoi(a) }}
              title="Arkistoi asiakas (palautettavissa)"
              aria-label="Arkistoi asiakas"
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', border: '1px solid #e2e8f0',
                background: 'white', color: '#6b7280', fontSize: '14px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              🗄
            </button>
          )}
          {/* Pala 2.18: ❌ pysyvä poisto vain arkisto-näkymässä */}
          {arkistoTila && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); poistaLopullisesti(a) }}
              title="Poista lopullisesti (peruuttamatonta)"
              aria-label="Poista lopullisesti"
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', border: '1px solid #fecaca',
                background: 'white', color: '#dc2626', fontSize: '14px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ❌
            </button>
          )}
          <button
            onClick={() => {
              if (arkistoTila) { palauta(a); return }
              if (korostettu) { onValitseAsiakas?.(a); return }
              // KIIRE-FIX 6 (D-malli): käynnillisillä avataan viimeisin käynti
              // muokkaustilassa; käynnittömille tarjotaan vanha uuden käynnin
              // polku. Tarkka logiikka paaPainikkeenKlikkaus-funktiossa.
              paaPainikkeenKlikkaus(a, kaynnit.length > 0)
            }}
            disabled={kaynnistettava === a.id}
            style={{
              padding:      '7px 16px',
              borderRadius: '20px',
              border:       'none',
              background:   arkistoTila ? '#6b7280' : (korostettu ? '#f59e0b' : '#1D9E75'),
              color:        'white',
              fontSize:     '13px',
              fontWeight:   500,
              cursor:       kaynnistettava === a.id ? 'wait' : 'pointer',
              opacity:      kaynnistettava === a.id ? 0.6 : 1,
              flexShrink:   0,
            }}
          >
            {arkistoTila
              ? '↺ Palauta'
              : (korostettu
                  ? 'Tarkista'
                  : (kaynnit.length > 0 ? 'Avaa' : '+ Aloita käynti'))}
          </button>
        </div>

        {/* Käyntipillerit — 4 uusinta käyntiä, klikkaus avaa modaalin */}
        {kaynnit.length > 0 && (
          <div style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        '6px',
            paddingLeft: '54px',  // sama sisennys kuin avatarin oikealla puolella
          }}>
            {kaynnit.map((k) => {
              const pvm = muotoilePvm(k.voimassa_alkaen, '—')
              const lyhytOtsikko = k.otsikko && k.otsikko.length > 18
                ? `${k.otsikko.slice(0, 16)}…`
                : (k.otsikko || '')
              const osat = [pvm, lyhytOtsikko].filter(Boolean)
              const sisalto = osat.join(' · ')
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAvoinKaynti({ lomakeVersioId: k.id, asiakas: a })
                  }}
                  style={{
                    background:   '#f3f4f6',
                    color:        '#374151',
                    padding:      '6px 12px',
                    minHeight:    '32px',
                    borderRadius: '999px',
                    fontSize:     '12px',
                    fontWeight:   500,
                    border:       'none',
                    cursor:       'pointer',
                    whiteSpace:   'nowrap',
                  }}
                  aria-label={`Avaa käynti ${pvm}${k.otsikko ? ` — ${k.otsikko}` : ''}`}
                  title={k.otsikko ? `${pvm} — ${k.otsikko}` : pvm}
                >
                  {sisalto}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="lista-leveys">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', margin: '0 0 8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>
          {arkistoTila ? '🗄 Arkisto' : 'Asiakasrekisteri'}
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#9ca3af', marginLeft: '8px' }}>
            {asiakkaat.length} asiakasta
          </span>
        </h2>
        {!arkistoTila && asiakkaat.length > 0 && (
          <button
            type="button"
            onClick={vieCSV}
            title="Lataa kaikki asiakkaat CSV-tiedostona (Excel-yhteensopiva)"
            style={{
              padding:      '6px 14px',
              borderRadius: '8px',
              border:       '1px solid #e2e8f0',
              background:   'white',
              color:        '#374151',
              fontSize:     '13px',
              fontWeight:   500,
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            ⬇ Vie CSV
          </button>
        )}
      </div>

      {/* Arkisto-linkki normaalitilassa, "Takaisin"-linkki arkistotilassa */}
      <div style={{ marginBottom: '16px' }}>
        {arkistoTila ? (
          <button
            type="button"
            onClick={onTakaisinRekisteriin}
            style={{ fontSize: '13px', color: '#1D9E75', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
          >
            ← Asiakasrekisteri
          </button>
        ) : arkistoMaara > 0 ? (
          <button
            type="button"
            onClick={onSiirryArkistoon}
            style={{ fontSize: '13px', color: '#6b7280', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}
          >
            🗄 Arkisto ({arkistoMaara})
          </button>
        ) : null}
      </div>

      <input
        type="text"
        placeholder="Hae nimellä, sähköpostilla tai puhelimella..."
        value={haku}
        onChange={e => setHaku(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: '10px',
          border: '1px solid #e2e8f0', fontSize: '14px',
          outline: 'none', marginBottom: '16px',
          background: 'white',
        }}
      />

      {/* Uudet asiakkaat — vain jos vahvistamattomia on */}
      {uudet.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '8px', paddingLeft: '4px',
          }}>
            <span style={{ fontSize: '14px' }}>🔔</span>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Uudet asiakkaat ({uudet.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uudet.map(a => <AsiakasKortti key={a.id} a={a} korostettu />)}
          </div>
        </div>
      )}

      {/* Vahvistetut asiakkaat */}
      {vahvistetut.length > 0 && (
        <div>
          {uudet.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingLeft: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Asiakkaat ({vahvistetut.length})
              </h3>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vahvistetut.map(a => <AsiakasKortti key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {uudet.length === 0 && vahvistetut.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          color: '#9ca3af', fontSize: '14px',
          background: 'white', borderRadius: '12px',
          border: '1px solid #f3f4f6',
        }}>
          {haku.trim() ? 'Ei hakutuloksia' : 'Ei asiakkaita vielä'}
        </div>
      )}

      {/* Käyntimodaali — avautuu pillerin klikkauksesta tai Avaa-napista.
          Pala 2.24: KayntiLomakeNakyma renderöi LomakeRenderoija:lla read-only
          (alkuperäinen lomakerakenne). KayntiNakyma jää fallback:ksi vanhoille
          käynneille joille lomakepohja_versio_id ei ole tallennettu. */}
      {avoinKaynti && (
        <KayntiLomakeNakyma
          lomakeVersioId={avoinKaynti.lomakeVersioId}
          asiakas={avoinKaynti.asiakas}
          onSulje={() => setAvoinKaynti(null)}
        />
      )}

      {/* Pikamuokkaus — avautuu kynä-ikonin klikkauksesta */}
      {pikamuokattava && (
        <PikamuokkausModaali
          asiakas={pikamuokattava}
          onSulje={() => setPikamuokattava(null)}
          onTallennettu={() => {
            setPikamuokattava(null)
            setPaikallinenRefresh((n) => n + 1)
          }}
        />
      )}
    </section>
  )
}
