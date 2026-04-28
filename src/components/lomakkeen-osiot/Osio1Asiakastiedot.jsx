import { useState, useRef } from 'react'
import { tallennaAsiakas } from '../../lib/db'
import AvattavaOsio from './AvattavaOsio'

// ─── apufunktiot ──────────────────────────────────────────────────────────────

const isoToFinnish = (arvo) => {
  if (!arvo) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(arvo)) return arvo
  if (/^\d{4}-\d{2}-\d{2}/.test(arvo)) {
    const [y, m, d] = arvo.split('T')[0].split('-')
    return `${d}.${m}.${y}`
  }
  return arvo
}

const finnishToISO = (arvo) => {
  if (!arvo) return null
  const osat = arvo.split('.')
  if (osat.length !== 3) return null
  const [d, m, y] = osat.map(s => s.trim())
  if (y.length !== 4 || isNaN(Number(d)) || isNaN(Number(m))) return null
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  return isNaN(new Date(iso).getTime()) ? null : iso
}

const muotoilePuhelin = (arvo) => {
  if (!arvo) return ''
  const t = arvo.trim()
  if (t.startsWith('+')) return t
  const n = t.replace(/\D/g, '')
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0, 3)} ${n.slice(3)}`
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

const sahkopostiOK = (s) => {
  if (!s) return true
  const at = s.indexOf('@')
  if (at < 1) return false
  const jalkeen = s.slice(at + 1)
  return jalkeen.includes('.') && jalkeen.split('.').pop().length >= 2
}

// ─── tyylimäärittelyt ─────────────────────────────────────────────────────────

const inputTyyli = {
  width:       '100%',
  padding:     '11px 36px 11px 12px',
  borderRadius: '10px',
  border:      '1.5px solid #e2e8f0',
  fontSize:    '14px',
  color:       '#111827',
  outline:     'none',
  boxSizing:   'border-box',
  background:  'white',
  fontFamily:  'inherit',
}

const numberInputTyyli = {
  ...inputTyyli,
  appearance:       'textfield',
  WebkitAppearance: 'none',
  MozAppearance:    'textfield',
}

// ─── kenttä-wrapper ───────────────────────────────────────────────────────────

function Kentta({ label, pakollinen, ok, virheViesti, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block' }}>
        {label}
        {pakollinen && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
        {ok && (
          <span style={{
            position:        'absolute',
            right:           '10px',
            top:             '50%',
            transform:       'translateY(-50%)',
            color:           '#1D9E75',
            fontSize:        '15px',
            pointerEvents:   'none',
            lineHeight:      1,
          }}>✓</span>
        )}
        {!ok && virheViesti && (
          <span style={{
            position:        'absolute',
            right:           '10px',
            top:             '50%',
            transform:       'translateY(-50%)',
            color:           '#EF4444',
            fontSize:        '15px',
            pointerEvents:   'none',
            lineHeight:      1,
          }}>⚠</span>
        )}
      </div>
      {virheViesti && (
        <span style={{ fontSize: '12px', color: '#EF4444' }}>{virheViesti}</span>
      )}
    </div>
  )
}

// ─── pääkomponentti ───────────────────────────────────────────────────────────

export default function Osio1Asiakastiedot({ asiakas, onTallennettu }) {
  const alku = {
    nimi:             asiakas?.nimi             ?? '',
    sahkoposti:       asiakas?.sahkoposti       ?? '',
    puhelin:          asiakas?.puhelin          ? muotoilePuhelin(asiakas.puhelin) : '',
    syntymaaika:      isoToFinnish(asiakas?.syntymaaika ?? ''),
    lahiosoite:       asiakas?.lahiosoite       ?? '',
    postinumero:      asiakas?.postinumero      ?? '',
    postitoimipaikka: asiakas?.postitoimipaikka ?? '',
    ammatti:          asiakas?.ammatti          ?? '',
    harrastukset:     asiakas?.harrastukset     ?? '',
    pituus:           asiakas?.pituus  != null  ? String(asiakas.pituus)  : '',
    paino:            asiakas?.paino   != null  ? String(asiakas.paino)   : '',
    miten_loysi:      asiakas?.miten_loysi      ?? '',
  }

  const [kentat, setKentat]         = useState(alku)
  const alkuperainen                = useRef(alku)
  const [kosketettu, setKosketettu] = useState({})
  const [virheet, setVirheet]       = useState({})
  const [tallentaa, setTallentaa]   = useState(false)
  const [vahvistus, setVahvistus]   = useState(null)
  const pvmRef                      = useRef(null)

  const paivita = (kentta, arvo) => {
    setKentat(k => ({ ...k, [kentta]: arvo }))
    setVirheet(v => { const u = { ...v }; delete u[kentta]; return u })
  }

  const kosketa = (kentta) => setKosketettu(k => ({ ...k, [kentta]: true }))

  // validointi
  const nimiOK        = kentat.nimi.trim().length > 0
  const puhelinOK     = kentat.puhelin.replace(/[\s]/g, '').replace(/[^+\d]/g, '').length >= 7
  const syntymaaikaOK = !!finnishToISO(kentat.syntymaaika)
  const spOK          = sahkopostiOK(kentat.sahkoposti)

  const naytaVirhe = (k) => {
    if (!kosketettu[k] && !virheet[k]) return null
    if (k === 'nimi')        return nimiOK        ? null : (virheet.nimi        ?? 'Nimi on pakollinen tieto')
    if (k === 'puhelin')     return puhelinOK     ? null : (virheet.puhelin     ?? 'Puhelinnumero on pakollinen tieto')
    if (k === 'syntymaaika') return syntymaaikaOK ? null : (virheet.syntymaaika ?? 'Tarkista syntymäaika (PP.KK.VVVV)')
    if (k === 'sahkoposti')  return spOK          ? null : (virheet.sahkoposti  ?? 'Tarkista sähköpostiosoite')
    return null
  }

  const muutoksia = Object.keys(kentat).filter(k => kentat[k] !== alkuperainen.current[k]).length

  // tila-ilmaisimet avattaville osioille
  const osoiteKpl = [kentat.lahiosoite, kentat.postinumero, kentat.postitoimipaikka].filter(Boolean).length
  const lisaKpl   = [kentat.ammatti, kentat.harrastukset, kentat.pituus, kentat.paino, kentat.miten_loysi].filter(Boolean).length

  const tallennaNappi = () => {
    if (tallentaa)    return 'Tallennetaan...'
    if (muutoksia === 0) return 'Ei tallentamattomia muutoksia'
    if (muutoksia === 1) return 'Tallenna 1 muutos'
    return `Tallenna ${muutoksia} muutosta`
  }

  const tallenna = async () => {
    setKosketettu(k => ({ ...k, nimi: true, puhelin: true, syntymaaika: true, sahkoposti: !!kentat.sahkoposti }))
    const uudetVirheet = {}
    if (!nimiOK)        uudetVirheet.nimi        = 'Nimi on pakollinen tieto'
    if (!puhelinOK)     uudetVirheet.puhelin     = 'Puhelinnumero on pakollinen tieto'
    if (!syntymaaikaOK) uudetVirheet.syntymaaika = 'Tarkista syntymäaika (PP.KK.VVVV)'
    if (!spOK)          uudetVirheet.sahkoposti  = 'Tarkista sähköpostiosoite'
    setVirheet(uudetVirheet)
    if (Object.keys(uudetVirheet).length > 0) return

    setTallentaa(true)
    setVahvistus(null)
    const tulos = await tallennaAsiakas({
      id:               asiakas?.id,
      nimi:             kentat.nimi.trim(),
      syntymaaika:      finnishToISO(kentat.syntymaaika),
      sahkoposti:       kentat.sahkoposti.trim() || null,
      puhelin:          kentat.puhelin.replace(/\s/g, ''),
      lahiosoite:       kentat.lahiosoite.trim()       || null,
      postinumero:      kentat.postinumero.trim()      || null,
      postitoimipaikka: kentat.postitoimipaikka.trim() || null,
      ammatti:          kentat.ammatti.trim()          || null,
      pituus:           kentat.pituus ? parseInt(kentat.pituus,  10) : null,
      paino:            kentat.paino  ? parseInt(kentat.paino,   10) : null,
    })
    setTallentaa(false)

    if (tulos) {
      alkuperainen.current = { ...kentat }
      setVahvistus('ok')
      onTallennettu?.(tulos)
    } else {
      setVahvistus('virhe')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Nimi ─────────────────────────────────────────────────────────── */}
      <Kentta label="Nimi" pakollinen ok={nimiOK} virheViesti={naytaVirhe('nimi')}>
        <input
          type="text"
          value={kentat.nimi}
          onChange={e => paivita('nimi', e.target.value)}
          onBlur={() => kosketa('nimi')}
          placeholder="Etunimi Sukunimi"
          style={inputTyyli}
        />
      </Kentta>

      {/* ── Sähköposti ───────────────────────────────────────────────────── */}
      <Kentta
        label="Sähköposti"
        pakollinen
        ok={!!(kentat.sahkoposti && spOK)}
        virheViesti={naytaVirhe('sahkoposti')}
      >
        <input
          type="email"
          value={kentat.sahkoposti}
          onChange={e => paivita('sahkoposti', e.target.value)}
          onBlur={() => kosketa('sahkoposti')}
          placeholder="etunimi@esimerkki.fi"
          style={inputTyyli}
        />
      </Kentta>

      {/* ── Puhelin ──────────────────────────────────────────────────────── */}
      <Kentta label="Puhelin" pakollinen ok={puhelinOK} virheViesti={naytaVirhe('puhelin')}>
        <input
          type="tel"
          value={kentat.puhelin}
          onChange={e => paivita('puhelin', e.target.value)}
          onBlur={() => {
            kosketa('puhelin')
            paivita('puhelin', muotoilePuhelin(kentat.puhelin))
          }}
          placeholder="040 123 4567"
          style={inputTyyli}
        />
      </Kentta>

      {/* ── Syntymäaika ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
          Syntymäaika<span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>
        </label>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={kentat.syntymaaika}
              onChange={e => paivita('syntymaaika', e.target.value)}
              onBlur={() => kosketa('syntymaaika')}
              placeholder="PP.KK.VVVV"
              maxLength={10}
              style={{ ...inputTyyli, borderRadius: '10px 0 0 10px' }}
            />
            {syntymaaikaOK && (
              <span style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', color: '#1D9E75',
                fontSize: '15px', pointerEvents: 'none',
              }}>✓</span>
            )}
            {!syntymaaikaOK && naytaVirhe('syntymaaika') && (
              <span style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', color: '#EF4444',
                fontSize: '15px', pointerEvents: 'none',
              }}>⚠</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => pvmRef.current?.showPicker?.()}
            title="Valitse kalenterista"
            style={{
              padding:      '0 14px',
              background:   '#f8fafc',
              border:       '1.5px solid #e2e8f0',
              borderLeft:   'none',
              borderRadius: '0 10px 10px 0',
              cursor:       'pointer',
              fontSize:     '18px',
              lineHeight:   1,
              minWidth:     '48px',
            }}
          >
            📅
          </button>
          <input
            ref={pvmRef}
            type="date"
            tabIndex={-1}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            onChange={e => {
              if (e.target.value) {
                paivita('syntymaaika', isoToFinnish(e.target.value))
                kosketa('syntymaaika')
              }
            }}
          />
        </div>
        {naytaVirhe('syntymaaika') && (
          <span style={{ fontSize: '12px', color: '#EF4444' }}>{naytaVirhe('syntymaaika')}</span>
        )}
      </div>

      {/* ── Avattava: lähiosoite ──────────────────────────────────────────── */}
      <AvattavaOsio
        otsikko="Lähiosoite, postinumero, paikka"
        tila={osoiteKpl === 0 ? 'Ei täytetty' : `${osoiteKpl}/3 täytetty`}
        tilaVihrea={osoiteKpl > 0}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Kentta label="Lähiosoite" ok={!!kentat.lahiosoite}>
            <input
              type="text"
              value={kentat.lahiosoite}
              onChange={e => paivita('lahiosoite', e.target.value)}
              placeholder="Esimerkkikatu 1 A 1"
              style={inputTyyli}
            />
          </Kentta>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 120px', minWidth: '100px' }}>
              <Kentta label="Postinumero" ok={!!kentat.postinumero}>
                <input
                  type="text"
                  value={kentat.postinumero}
                  onChange={e => paivita('postinumero', e.target.value)}
                  placeholder="00100"
                  maxLength={5}
                  style={inputTyyli}
                />
              </Kentta>
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <Kentta label="Postitoimipaikka" ok={!!kentat.postitoimipaikka}>
                <input
                  type="text"
                  value={kentat.postitoimipaikka}
                  onChange={e => paivita('postitoimipaikka', e.target.value)}
                  placeholder="Helsinki"
                  style={inputTyyli}
                />
              </Kentta>
            </div>
          </div>
        </div>
      </AvattavaOsio>

      {/* ── Avattava: lisätiedot ──────────────────────────────────────────── */}
      <AvattavaOsio
        otsikko="Ammatti, harrastukset, pituus, paino, miten löysit"
        tila={lisaKpl === 0 ? 'Ei täytetty' : `${lisaKpl}/5 täytetty`}
        tilaVihrea={lisaKpl > 0}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Kentta label="Ammatti / työ" ok={!!kentat.ammatti}>
            <input
              type="text"
              value={kentat.ammatti}
              onChange={e => paivita('ammatti', e.target.value)}
              placeholder="Esim. toimistotyöntekijä"
              style={inputTyyli}
            />
          </Kentta>
          <Kentta label="Harrastukset" ok={!!kentat.harrastukset}>
            <input
              type="text"
              value={kentat.harrastukset}
              onChange={e => paivita('harrastukset', e.target.value)}
              placeholder="Esim. pyöräily, uinti"
              style={inputTyyli}
            />
          </Kentta>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <Kentta label="Pituus (cm)" ok={!!kentat.pituus}>
                <input
                  type="number"
                  value={kentat.pituus}
                  onChange={e => paivita('pituus', e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  placeholder="175"
                  min={100}
                  max={250}
                  style={numberInputTyyli}
                />
              </Kentta>
            </div>
            <div style={{ flex: 1 }}>
              <Kentta label="Paino (kg)" ok={!!kentat.paino}>
                <input
                  type="number"
                  value={kentat.paino}
                  onChange={e => paivita('paino', e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  placeholder="72"
                  min={20}
                  max={300}
                  style={numberInputTyyli}
                />
              </Kentta>
            </div>
          </div>
          <Kentta label="Miten löysit meidät" ok={!!kentat.miten_loysi}>
            <input
              type="text"
              value={kentat.miten_loysi}
              onChange={e => paivita('miten_loysi', e.target.value)}
              placeholder="Esim. Google, tuttava suositteli"
              style={inputTyyli}
            />
          </Kentta>
        </div>
      </AvattavaOsio>

      {/* ── Tallennus ────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: '4px' }}>
        {vahvistus === 'ok' && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#1D9E75', fontWeight: '600', margin: '0 0 10px' }}>
            ✓ Asiakastiedot tallennettu
          </p>
        )}
        {vahvistus === 'virhe' && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#EF4444', fontWeight: '600', margin: '0 0 10px' }}>
            ⚠ Tallennus epäonnistui — yritä uudelleen
          </p>
        )}
        <button
          type="button"
          onClick={tallenna}
          disabled={tallentaa || muutoksia === 0}
          style={{
            width:        '100%',
            minHeight:    '48px',
            borderRadius: '12px',
            border:       'none',
            background:   muutoksia > 0 ? '#1D9E75' : '#e2e8f0',
            color:        muutoksia > 0 ? 'white'   : '#9ca3af',
            fontSize:     '14px',
            fontWeight:   '700',
            cursor:       muutoksia > 0 ? 'pointer' : 'default',
            transition:   'all 0.15s',
            letterSpacing: '0.01em',
          }}
        >
          {tallennaNappi()}
        </button>
      </div>

    </div>
  )
}
