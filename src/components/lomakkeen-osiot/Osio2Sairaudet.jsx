import { useState, useEffect, useRef } from 'react'
import {
  haeSairausTyypit,
  varmistaTaiLuoVersio,
  paivitaSairausValinta,
  haeLomakeTekstikentat,
  paivitaLomakeTekstikentat,
} from '../../lib/db'
import { useAsiakkaanSairaudet } from '../../hooks/useAsiakkaanSairaudet'
import AvattavaOsio from './AvattavaOsio'

// ─── ryhmien järjestys ────────────────────────────────────────────────────────

const RYHMAT_JARJESTYS = [
  'YLEISET',
  'SYDÄN JA VERENKIERTO',
  'SELKÄRANKA JA NIVELET',
  'NEUROLOGISET',
  'NAINEN',
  'MIELENTERVEYS',
  'MUUT',
  'ESTE HOIDOLLE',
]

const onEsteRyhma = (nimi) => nimi?.startsWith('ESTE')

// ─── kasvava textarea ─────────────────────────────────────────────────────────

function KasvavaTextarea({ value, onChange, placeholder }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={2}
      style={{
        width:       '100%',
        padding:     '10px 12px',
        borderRadius: '10px',
        border:      '1.5px solid #e2e8f0',
        fontSize:    '14px',
        resize:      'none',
        overflow:    'hidden',
        lineHeight:  1.5,
        boxSizing:   'border-box',
        fontFamily:  'inherit',
        color:       '#111827',
        background:  'white',
        display:     'block',
      }}
    />
  )
}

// ─── pääkomponentti ───────────────────────────────────────────────────────────

export default function Osio2Sairaudet({ asiakas }) {
  const [sairausTyypit,  setSairausTyypit]  = useState([])
  const [valitut,        setValitut]        = useState({})
  const [tarkenteet,     setTarkenteet]     = useState({})
  const alustettuRef = useRef(false)   // ref → ei aiheuta re-renderiä, eikä loop-riskiä
  const [versioId,       setVersioId]       = useState(null)
  const [tallennusViesti, setTallennusViesti] = useState(null)
  const [undoToiminto,   setUndoToiminto]   = useState(null)
  const undoTimerId = useRef(null)

  const [tekstikentat, setTekstikentat] = useState({
    laakitys:               '',
    diagnosoidut_sairaudet: '',
    vammat_huomiot:         '',
  })
  const alkuperainenTeksti = useRef({ laakitys: '', diagnosoidut_sairaudet: '', vammat_huomiot: '' })
  const [tallentaa,     setTallentaa]     = useState(false)
  const [tekstiTulos,   setTekstiTulos]   = useState(null)
  const [lataaRyhmat,   setLataaRyhmat]   = useState(true)
  const [ryhmaVirhe,    setRyhmaVirhe]    = useState(null)

  const { sairaudet: sairaudetDB, lataa: lataaSairaudet } = useAsiakkaanSairaudet(asiakas?.id)

  // Hae kaikki sairaustyipit
  useEffect(() => {
    setLataaRyhmat(true)
    setRyhmaVirhe(null)
    haeSairausTyypit().then(data => {
      const lista = data ?? []
      setSairausTyypit(lista)
      if (lista.length === 0) {
        setRyhmaVirhe('Sairauslistaa ei löydy — tarkista selaimen konsoli (F12)')
      }
    }).catch(err => {
      setRyhmaVirhe(`Virhe: ${err?.message ?? 'tuntematon'}`)
    }).finally(() => {
      setLataaRyhmat(false)
    })
  }, [])

  // Alusta valitut sairaudet DB:stä — yksi kerta per mount
  useEffect(() => {
    if (lataaSairaudet || alustettuRef.current) return
    alustettuRef.current = true
    const v = {}
    const t = {}
    for (const s of sairaudetDB) {
      if (s.on_voimassa && s.sairaus_tyyppi?.id) {
        v[s.sairaus_tyyppi.id] = true
        if (s.tarkenne) t[s.sairaus_tyyppi.id] = s.tarkenne
      }
    }
    setValitut(v)
    setTarkenteet(t)
  }, [sairaudetDB, lataaSairaudet])

  // Alusta tekstikentät DB:stä
  useEffect(() => {
    if (!asiakas?.id) return
    haeLomakeTekstikentat(asiakas.id).then(data => {
      if (!data) return
      const alku = {
        laakitys:               data.laakitys               ?? '',
        diagnosoidut_sairaudet: data.diagnosoidut_sairaudet ?? '',
        vammat_huomiot:         data.vammat_huomiot         ?? '',
      }
      setTekstikentat(alku)
      alkuperainenTeksti.current = alku
    })
  }, [asiakas?.id])

  // Hae tai luo versio (laiskasti)
  const haeVersioId = async () => {
    if (versioId) return versioId
    if (!asiakas?.id) return null
    const id = await varmistaTaiLuoVersio(asiakas.id)
    if (id) setVersioId(id)
    return id
  }

  // ─── ryhmittely ────────────────────────────────────────────────────────────

  console.log('[Osio2 DEBUG] sairausTyypit.length:', sairausTyypit?.length)
  if (sairausTyypit?.length > 0) {
    console.log('[Osio2 DEBUG] ensimmäinen kokonaan:', JSON.stringify(sairausTyypit[0], null, 2))
    console.log('[Osio2 DEBUG] keys:', Object.keys(sairausTyypit[0]))
  }
  const ryhmaMap = {}
  for (const s of sairausTyypit) {
    const r = s.ryhma ?? 'MUUT'
    if (!ryhmaMap[r]) ryhmaMap[r] = []
    ryhmaMap[r].push(s)
  }
  console.log('[Osio2 DEBUG] ryhmaMap keys:', Object.keys(ryhmaMap))
  const ryhmat = RYHMAT_JARJESTYS
    .filter(r => ryhmaMap[r]?.length > 0)
    .map(r => ({ nimi: r, sairaudet: ryhmaMap[r] }))
  console.log('[Osio2 DEBUG] ryhmat.length:', ryhmat?.length)

  // ─── autosave checkboxille ─────────────────────────────────────────────────

  const vaihdaSairaus = async (sairausId, paalla) => {
    const edellinen         = !!valitut[sairausId]
    const edellinenTarkenne = tarkenteet[sairausId] ?? ''

    // Optimistinen päivitys
    setValitut(v => ({ ...v, [sairausId]: paalla }))

    if (!asiakas?.id) {
      setValitut(v => ({ ...v, [sairausId]: edellinen }))
      naytoaViesti('⚠ Tallenna ensin osion 1 asiakastiedot', false)
      return
    }

    const vid = await haeVersioId()
    if (!vid) {
      setValitut(v => ({ ...v, [sairausId]: edellinen }))
      naytoaViesti('⚠ Tallennus epäonnistui', false)
      return
    }

    const ok = await paivitaSairausValinta(vid, sairausId, paalla, edellinenTarkenne)
    if (ok) {
      if (undoTimerId.current) clearTimeout(undoTimerId.current)
      setUndoToiminto({ sairausId, edellinen, tarkenne: edellinenTarkenne, versioId: vid })
      setTallennusViesti('✓ Tallennettu')
      undoTimerId.current = setTimeout(() => {
        setUndoToiminto(null)
        setTallennusViesti(null)
      }, 5000)
    } else {
      setValitut(v => ({ ...v, [sairausId]: edellinen }))
      naytoaViesti('⚠ Tallennus epäonnistui', false)
    }
  }

  const kumoaToiminto = async () => {
    if (!undoToiminto) return
    if (undoTimerId.current) clearTimeout(undoTimerId.current)
    const { sairausId, edellinen, tarkenne, versioId: vid } = undoToiminto
    setValitut(v => ({ ...v, [sairausId]: edellinen }))
    setTarkenteet(t => ({ ...t, [sairausId]: tarkenne }))
    await paivitaSairausValinta(vid, sairausId, edellinen, tarkenne)
    setUndoToiminto(null)
    setTallennusViesti('Peruutettu')
    undoTimerId.current = setTimeout(() => setTallennusViesti(null), 2000)
  }

  const vaihdaTarkenne = (sairausId, arvo) => {
    setTarkenteet(t => ({ ...t, [sairausId]: arvo }))
  }

  const tallennaTarkenne = async (sairausId) => {
    if (!valitut[sairausId]) return
    const vid = versioId ?? await haeVersioId()
    if (!vid) return
    await paivitaSairausValinta(vid, sairausId, true, tarkenteet[sairausId])
  }

  // ─── tekstikenttien manuaalinen tallennus ──────────────────────────────────

  const muutoksiaTeksti = Object.keys(tekstikentat).filter(
    k => tekstikentat[k] !== alkuperainenTeksti.current[k]
  ).length

  const tallennaTekstikentat = async () => {
    if (!asiakas?.id) return
    setTallentaa(true)
    const ok = await paivitaLomakeTekstikentat(asiakas.id, tekstikentat)
    setTallentaa(false)
    if (ok) {
      alkuperainenTeksti.current = { ...tekstikentat }
      setTekstiTulos('ok')
    } else {
      setTekstiTulos('virhe')
    }
    setTimeout(() => setTekstiTulos(null), 3000)
  }

  // ─── apufunktiot ──────────────────────────────────────────────────────────

  const naytoaViesti = (teksti, onOk) => {
    setTallennusViesti(teksti)
    setTimeout(() => setTallennusViesti(null), 3000)
  }

  const inputTyyli = {
    width:        '100%',
    padding:      '8px 10px',
    borderRadius: '8px',
    border:       '1.5px solid #e2e8f0',
    fontSize:     '13px',
    color:        '#111827',
    boxSizing:    'border-box',
    fontFamily:   'inherit',
    background:   'white',
    outline:      'none',
  }

  const tallennaNappiTeksti = () => {
    if (tallentaa)       return 'Tallennetaan...'
    if (muutoksiaTeksti === 0) return 'Ei tallentamattomia muutoksia'
    if (muutoksiaTeksti === 1) return 'Tallenna 1 muutos'
    return `Tallenna ${muutoksiaTeksti} muutosta`
  }

  // ─── render ───────────────────────────────────────────────────────────────

  console.log('[Osio2 DEBUG] renderöidään, lataaRyhmat:', lataaRyhmat)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* ── Lataus / virhe ─────────────────────────────────────────────── */}
      {lataaRyhmat && (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0' }}>
          Ladataan sairauslistaa…
        </p>
      )}
      {!lataaRyhmat && ryhmaVirhe && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '13px',
          color: '#dc2626',
        }}>
          ⚠ {ryhmaVirhe}
        </div>
      )}

      {/* ── Sairausryhmät ──────────────────────────────────────────────── */}
      {ryhmat.map(ryhma => {
        const este        = onEsteRyhma(ryhma.nimi)
        const valittuja   = ryhma.sairaudet.filter(s => !!valitut[s.id]).length
        const tilaTeksti  = valittuja === 0 ? 'Ei valintoja' : `${valittuja}/${ryhma.sairaudet.length} valittu`
        const otsikko     = este
          ? `⚠ ESTE HOIDOLLE — ole yhteydessä hoitajaan`
          : ryhma.nimi

        return (
          <AvattavaOsio
            key={ryhma.nimi}
            otsikko={otsikko}
            tila={tilaTeksti}
            tilaVihrea={valittuja > 0}
            varoitus={este}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ryhma.sairaudet.map(sairaus => (
                <div key={sairaus.id}>
                  <label style={{
                    display:    'flex',
                    alignItems: 'flex-start',
                    gap:        '12px',
                    padding:    '10px 4px',
                    cursor:     'pointer',
                    minHeight:  '48px',
                  }}>
                    <input
                      type="checkbox"
                      checked={!!valitut[sairaus.id]}
                      onChange={e => vaihdaSairaus(sairaus.id, e.target.checked)}
                      style={{
                        width:       '24px',
                        height:      '24px',
                        marginTop:   '1px',
                        flexShrink:  0,
                        cursor:      'pointer',
                        accentColor: este ? '#d97706' : '#1D9E75',
                      }}
                    />
                    <div style={{ flex: 1, paddingTop: '2px' }}>
                      <span style={{ fontSize: '14px', color: este ? '#92400e' : '#111827' }}>
                        {sairaus.nimi}
                      </span>

                      {/* Tarkenne — näkyy vain kun rasti päällä */}
                      {valitut[sairaus.id] && sairaus.tarkenne_label && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            {sairaus.tarkenne_label}
                          </div>
                          {sairaus.tarkenne_tyyppi === 'select' ? (
                            <select
                              value={tarkenteet[sairaus.id] ?? ''}
                              onChange={e => vaihdaTarkenne(sairaus.id, e.target.value)}
                              onBlur={() => tallennaTarkenne(sairaus.id)}
                              style={{ ...inputTyyli, width: 'auto', minWidth: '140px' }}
                            >
                              <option value="">Valitse...</option>
                              <option value="matala">Matala</option>
                              <option value="korkea">Korkea</option>
                            </select>
                          ) : (
                            <input
                              type={sairaus.tarkenne_tyyppi ?? 'text'}
                              value={tarkenteet[sairaus.id] ?? ''}
                              onChange={e => vaihdaTarkenne(sairaus.id, e.target.value)}
                              onBlur={() => tallennaTarkenne(sairaus.id)}
                              placeholder={sairaus.tarkenne_label}
                              style={{ ...inputTyyli, maxWidth: '220px' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </AvattavaOsio>
        )
      })}

      {/* ── Autosave-ilmoitus (checkboxit) ─────────────────────────────── */}
      {tallennusViesti && (
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         '8px',
          padding:     '8px 14px',
          borderRadius: '8px',
          background:  tallennusViesti.startsWith('✓')
            ? '#f0fdf4'
            : tallennusViesti === 'Peruutettu'
              ? '#f8fafc'
              : '#fef2f2',
          border: `1px solid ${
            tallennusViesti.startsWith('✓')
              ? '#bbf7d0'
              : tallennusViesti === 'Peruutettu'
                ? '#e2e8f0'
                : '#fecaca'
          }`,
        }}>
          <span style={{
            fontSize:   '13px',
            fontWeight: '500',
            color:      tallennusViesti.startsWith('✓')
              ? '#15803d'
              : tallennusViesti === 'Peruutettu'
                ? '#374151'
                : '#dc2626',
          }}>
            {tallennusViesti}
          </span>
          {undoToiminto && tallennusViesti === '✓ Tallennettu' && (
            <button
              type="button"
              onClick={kumoaToiminto}
              style={{
                marginLeft:   'auto',
                fontSize:     '12px',
                color:        '#6b7280',
                background:   'none',
                border:       'none',
                cursor:       'pointer',
                fontWeight:   '600',
                padding:      '2px 8px',
                borderRadius: '6px',
              }}
            >
              Kumoa
            </button>
          )}
        </div>
      )}

      {/* ── Erotinviiva ────────────────────────────────────────────────── */}
      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

      {/* ── Vapaat tekstikentät ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
            Säännöllinen lääkitys
          </label>
          <KasvavaTextarea
            value={tekstikentat.laakitys}
            onChange={e => setTekstikentat(k => ({ ...k, laakitys: e.target.value }))}
            placeholder="Esim. verenpainelääke (nimi, annostus)"
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
            Diagnosoidut sairaudet
          </label>
          <KasvavaTextarea
            value={tekstikentat.diagnosoidut_sairaudet}
            onChange={e => setTekstikentat(k => ({ ...k, diagnosoidut_sairaudet: e.target.value }))}
            placeholder="Lisätietoja edellä mainituista tai muista sairauksista"
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
            Vammat ja muut hoidossa huomioitavat seikat
          </label>
          <KasvavaTextarea
            value={tekstikentat.vammat_huomiot}
            onChange={e => setTekstikentat(k => ({ ...k, vammat_huomiot: e.target.value }))}
            placeholder="Esim. olkapäävamma 2018"
          />
        </div>
      </div>

      {/* ── Tallenna-nappi (tekstikentät) ──────────────────────────────── */}
      <div style={{ paddingTop: '8px' }}>
        {tekstiTulos === 'ok' && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#1D9E75', fontWeight: '600', margin: '0 0 10px' }}>
            ✓ Tallennettu
          </p>
        )}
        {tekstiTulos === 'virhe' && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#EF4444', fontWeight: '600', margin: '0 0 10px' }}>
            ⚠ Tallennus epäonnistui — yritä uudelleen
          </p>
        )}
        <button
          type="button"
          onClick={tallennaTekstikentat}
          disabled={tallentaa || muutoksiaTeksti === 0}
          style={{
            width:        '100%',
            minHeight:    '48px',
            borderRadius: '12px',
            border:       'none',
            background:   muutoksiaTeksti > 0 ? '#1D9E75' : '#e2e8f0',
            color:        muutoksiaTeksti > 0 ? 'white'   : '#9ca3af',
            fontSize:     '14px',
            fontWeight:   '700',
            cursor:       muutoksiaTeksti > 0 ? 'pointer' : 'default',
            transition:   'all 0.15s',
          }}
        >
          {tallennaNappiTeksti()}
        </button>
      </div>

    </div>
  )
}
