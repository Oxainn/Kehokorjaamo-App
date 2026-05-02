// Versionhallinta-sivu (D2) — yhteen näkymään Live + Kehitys -tila.
//
// Toiminnot:
// - Kaksi rinnakkaista paneelia (LIVE | KEHITYS): commit, URL, status
// - Diff-lista (Kehityksen committit jotka eivät ole vielä Livessä)
// - "Siirrä Liveen" -nappi (toistaiseksi disabled — D3 tuo backendin)
//
// Lähteet:
// - GitHub API (julkinen, ei tokenia tarvita) — commit-data + diff
// - tunnistaYmparisto() — käyttäjän nykyinen ympäristö
// - Supabase-yhteys: vain nykyinen ympäristö (cross-env vaatii D3)
//
// Mitä EI tee D2:ssa:
// - Vercel deploy-tila (vaatii VERCEL_TOKEN — D3)
// - Cross-env Supabase-tilastot (asiakkaiden kpl toisesta DB:stä)
// - Status-pollaus (D4)
// - Rollback (D5)

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { YMPARISTOT, haeViimeisinCommit, haeErotHaarat, pingaaUrl, GITHUB_REPO } from '../../lib/ymparistot'
import { tunnistaYmparisto, YMPARISTO } from '../../lib/ymparisto'
import SiirraLiveenModaali from './SiirraLiveenModaali'
import RollbackModaali from './RollbackModaali'

// D4: status-pollausväli ja hälytysrajat
const POLLAUS_VALI_MS = 30_000
const JULKAISEMATON_VAROITUS_PV = 5

const muotoilePvm = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('fi-FI', { dateStyle: 'short', timeStyle: 'short' })
}

const lyhytSha = (sha) => sha?.slice(0, 7) ?? ''

function StatusPallo({ ok, latautuu }) {
  const vari = latautuu ? '#9ca3af' : ok ? '#22c55e' : '#ef4444'
  return (
    <span style={{
      display:      'inline-block',
      width:        '10px',
      height:       '10px',
      borderRadius: '50%',
      background:   vari,
      flexShrink:   0,
    }} />
  )
}

// D4: yksittäisen hälytyksen rendaus
function HalytysRivi({ vakavuus, teksti }) {
  // vakavuus: 'kriittinen' | 'varoitus' | 'ok' | 'info'
  const tyyli = {
    kriittinen: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', merkki: '🔴' },
    varoitus:   { background: '#fffbeb', border: '1px solid #fcd34d', color: '#78350f', merkki: '🟡' },
    ok:         { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', merkki: '🟢' },
    info:       { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', merkki: 'ℹ️' },
  }[vakavuus] ?? { background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', merkki: '·' }

  return (
    <div style={{
      ...tyyli,
      borderRadius: '8px',
      padding:      '8px 12px',
      fontSize:     '13px',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
      lineHeight:   1.4,
    }}>
      <span>{tyyli.merkki}</span>
      <span>{teksti}</span>
    </div>
  )
}

function YmparistoPaneeli({ avain, ymparisto, omaYmparisto, commit, virhe, pingTila }) {
  const onOma = avain === omaYmparisto
  // D4: paneelin status-pallo huomioi sekä commit-haun että ping-tilan
  const ylhaalla  = pingTila === 'ylhaalla'
  const alhaalla  = pingTila === 'alhaalla'
  const palloOk   = !virhe && !alhaalla
  const palloLatautuu = !commit && !virhe && !ylhaalla && !alhaalla
  return (
    <div style={{
      flex:         '1 1 320px',
      minWidth:     '300px',
      background:   'white',
      border:       `2px solid ${ymparisto.vari}`,
      borderRadius: '12px',
      padding:      '16px 18px',
      display:      'flex',
      flexDirection: 'column',
      gap:          '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusPallo ok={palloOk} latautuu={palloLatautuu} />
          <h3 style={{
            fontSize:   '14px',
            fontWeight: 700,
            color:      ymparisto.vari,
            margin:     0,
            letterSpacing: '0.05em',
          }}>{ymparisto.nimi}</h3>
          {onOma && (
            <span style={{
              fontSize:     '10px',
              padding:      '2px 6px',
              borderRadius: '4px',
              background:   ymparisto.variBg,
              color:        ymparisto.vari,
              fontWeight:   600,
            }}>← olet täällä</span>
          )}
        </div>
        <a
          href={ymparisto.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}
        >
          ↗ avaa
        </a>
      </div>

      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
        {ymparisto.kuvaus}
      </p>

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <RiviPari
          label="Tila"
          arvo={
            pingTila === 'ylhaalla' ? <span style={{ color: '#22c55e' }}>✓ vastaa</span>
            : pingTila === 'alhaalla' ? <span style={{ color: '#ef4444' }}>✗ ei vastaa</span>
            : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>tarkistetaan…</span>
          }
        />
        <RiviPari label="URL" arvo={ymparisto.url.replace('https://', '')} />
        <RiviPari label="Haara" arvo={ymparisto.githubBranch} />
        <RiviPari
          label="Viim. commit"
          arvo={virhe
            ? <span style={{ color: '#ef4444' }}>{virhe}</span>
            : commit
              ? <a href={commit.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1D9E75', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px' }}>
                  {lyhytSha(commit.sha)}
                </a>
              : 'Ladataan…'}
        />
        {commit && !virhe && (
          <>
            <RiviPari label="Viesti" arvo={<span style={{ color: '#374151' }}>{commit.viesti}</span>} />
            <RiviPari label="Aika" arvo={muotoilePvm(commit.pvm)} />
            <RiviPari label="Tekijä" arvo={commit.tekija || '—'} />
          </>
        )}
        <RiviPari
          label="Vercel-deploy"
          arvo={<span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(D3)</span>}
        />
        <RiviPari
          label="Supabase"
          arvo={onOma
            ? <span style={{ color: '#22c55e' }}>✓ yhteys</span>
            : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(D3)</span>}
        />
      </div>
    </div>
  )
}

function RiviPari({ label, arvo }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', fontSize: '13px' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color: '#374151', wordBreak: 'break-all' }}>{arvo}</span>
    </div>
  )
}

export default function Versionhallinta() {
  const omaYmparisto = tunnistaYmparisto()  // 'live' | 'kehitys' | 'local'

  const [liveCommit,    setLiveCommit]    = useState(null)
  const [kehitysCommit, setKehitysCommit] = useState(null)
  const [erot,          setErot]          = useState(null)  // null = lataa, [] = ei eroja
  const [virheet,       setVirheet]       = useState({ live: null, kehitys: null, erot: null })
  const [paivitettyAt,  setPaivitettyAt]  = useState(null)
  const [omaAsiakkaita, setOmaAsiakkaita] = useState(null)
  // D4: ping-tila kummallekin URLille — 'ylhaalla' | 'alhaalla' | null (tarkistetaan)
  const [pingLive,    setPingLive]    = useState(null)
  const [pingKehitys, setPingKehitys] = useState(null)
  // D4: oman Supabasen tila
  const [omaSupabaseOk, setOmaSupabaseOk] = useState(null)
  // D3 + D5: modaalit ja julkaisut-loki
  const [siirraModaaliAuki,  setSiirraModaaliAuki]  = useState(false)
  const [rollbackModaaliAuki, setRollbackModaaliAuki] = useState(false)
  const [julkaisut, setJulkaisut] = useState(null)  // null = ei haettu / [] = ei merkintöjä

  const lataa = useCallback(async () => {
    setVirheet({ live: null, kehitys: null, erot: null })
    // GitHub-haut rinnakkain
    const [liveTulos, kehitysTulos, erotTulos] = await Promise.allSettled([
      haeViimeisinCommit('main'),
      haeViimeisinCommit('kehitys'),
      haeErotHaarat('main', 'kehitys'),
    ])
    if (liveTulos.status === 'fulfilled') setLiveCommit(liveTulos.value)
    else setVirheet((v) => ({ ...v, live: liveTulos.reason?.message ?? 'Haku epäonnistui' }))

    if (kehitysTulos.status === 'fulfilled') setKehitysCommit(kehitysTulos.value)
    else setVirheet((v) => ({ ...v, kehitys: kehitysTulos.reason?.message ?? 'Haku epäonnistui' }))

    if (erotTulos.status === 'fulfilled') setErot(erotTulos.value)
    else setVirheet((v) => ({ ...v, erot: erotTulos.reason?.message ?? 'Haku epäonnistui' }))

    setPaivitettyAt(new Date())
  }, [])

  // Asiakkaiden kpl-laskuri vain omasta ympäristöstä (cross-env vaatii D3)
  useEffect(() => {
    let peruttu = false
    supabase
      .from('asiakkaat')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (peruttu) return
        if (error) setOmaSupabaseOk(false)
        else { setOmaAsiakkaita(count ?? 0); setOmaSupabaseOk(true) }
      })
    return () => { peruttu = true }
  }, [])

  // D4: status-pollaus 30s välein. Aktivoituu kun komponentti mountattu
  // (Versionhallinta-accordion auki) ja siivotaan unmountissa.
  useEffect(() => {
    let peruttu = false
    async function pingaa() {
      const [liveTulos, kehitysTulos] = await Promise.all([
        pingaaUrl(YMPARISTOT.live.url),
        pingaaUrl(YMPARISTOT.kehitys.url),
      ])
      if (peruttu) return
      setPingLive(liveTulos.ok ? 'ylhaalla' : 'alhaalla')
      setPingKehitys(kehitysTulos.ok ? 'ylhaalla' : 'alhaalla')
    }
    pingaa()
    const intervalli = setInterval(pingaa, POLLAUS_VALI_MS)
    return () => { peruttu = true; clearInterval(intervalli) }
  }, [])

  useEffect(() => { lataa() }, [lataa])

  // D3 + D5: hae viimeisimmät julkaisut audit-lokina (vain Kehitys-DB:ssä)
  const lataaJulkaisut = useCallback(async () => {
    if (omaYmparisto !== YMPARISTO.KEHITYS) {
      setJulkaisut([])
      return
    }
    const { data, error } = await supabase
      .from('julkaisut')
      .select('id, toiminto, julkaistut_commitit, status, virhe, kesto_ms, merge_sha, luotu')
      .order('luotu', { ascending: false })
      .limit(10)
    if (!error) setJulkaisut(data ?? [])
  }, [omaYmparisto])
  useEffect(() => { lataaJulkaisut() }, [lataaJulkaisut])

  // D4: rakenna hälytyslista nykyisestä tilasta
  const halytykset = []
  if (pingLive === 'alhaalla') {
    halytykset.push({ vakavuus: 'kriittinen', teksti: 'LIVE ei vastaa — kehokorjaamo-app.vercel.app on tavoittamattomissa.' })
  }
  if (pingKehitys === 'alhaalla') {
    halytykset.push({ vakavuus: 'varoitus', teksti: 'KEHITYS ei vastaa — kehokorjaamo-kehitys.vercel.app on tavoittamattomissa.' })
  }
  if (omaSupabaseOk === false) {
    halytykset.push({ vakavuus: 'kriittinen', teksti: `Supabase-yhteys virhe (${YMPARISTOT[omaYmparisto]?.nimi ?? omaYmparisto.toUpperCase()}) — DB-kyselyt eivät onnistu.` })
  }
  // Julkaisematon yli 5 päivää
  if (erot && erot.length > 0) {
    const vanhin = erot[0]?.pvm  // GitHub compare palauttaa vanhin ensin
    if (vanhin) {
      const ika = (Date.now() - new Date(vanhin).getTime()) / (1000 * 60 * 60 * 24)
      if (ika >= JULKAISEMATON_VAROITUS_PV) {
        halytykset.push({
          vakavuus: 'varoitus',
          teksti: `Kehityksessä ${erot.length} julkaisematonta committia, vanhin ${Math.floor(ika)} päivää sitten.`,
        })
      }
    }
  }
  if (halytykset.length === 0 && pingLive && pingKehitys && omaSupabaseOk !== false) {
    halytykset.push({ vakavuus: 'ok', teksti: 'OK — kaikki ympäristöt vastaavat normaalisti.' })
  }

  const eroaKpl = erot?.length ?? 0
  const onEroja = eroaKpl > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* D4: hälytyslista — pollaus 30s välein */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {halytykset.map((h, i) => (
          <HalytysRivi key={i} vakavuus={h.vakavuus} teksti={h.teksti} />
        ))}
      </div>

      {/* Päivityspainike + aikaleima */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          {paivitettyAt
            ? <>Commit-data päivitetty: {muotoilePvm(paivitettyAt.toISOString())}</>
            : 'Ladataan tila…'}
          {' · '}
          <span>Status-pollaus joka {Math.round(POLLAUS_VALI_MS / 1000)} s</span>
          {' · '}
          <span>Oma ympäristö: <strong>{YMPARISTOT[omaYmparisto]?.nimi ?? omaYmparisto.toUpperCase()}</strong></span>
          {omaAsiakkaita != null && (
            <> {' · '} {omaAsiakkaita} asiakasta tässä DB:ssä</>
          )}
        </p>
        <button
          type="button"
          onClick={lataa}
          style={{
            fontSize:     '12px',
            padding:      '6px 12px',
            minHeight:    '32px',
            borderRadius: '8px',
            border:       '1px solid #e5e7eb',
            background:   'white',
            color:        '#374151',
            cursor:       'pointer',
          }}
        >
          🔄 Päivitä
        </button>
      </div>

      {/* Kaksi paneelia */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <YmparistoPaneeli
          avain="live"
          ymparisto={YMPARISTOT.live}
          omaYmparisto={omaYmparisto}
          commit={liveCommit}
          virhe={virheet.live}
          pingTila={pingLive}
        />
        <YmparistoPaneeli
          avain="kehitys"
          ymparisto={YMPARISTOT.kehitys}
          omaYmparisto={omaYmparisto}
          commit={kehitysCommit}
          virhe={virheet.kehitys}
          pingTila={pingKehitys}
        />
      </div>

      {/* Erot Kehityksessä */}
      <div style={{
        background:   'white',
        border:       '1px solid #e5e7eb',
        borderRadius: '12px',
        padding:      '16px 18px',
        display:      'flex',
        flexDirection: 'column',
        gap:          '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Erot Kehityksessä
            {erot && (
              <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
                ({eroaKpl} commit{eroaKpl === 1 ? '' : 'tia'} julkaisematta)
              </span>
            )}
          </h3>
          <a
            href={`https://github.com/${GITHUB_REPO}/compare/main...kehitys`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#1D9E75', textDecoration: 'none' }}
          >
            Avaa GitHub-vertailu ↗
          </a>
        </div>

        {virheet.erot && (
          <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>
            Erot eivät latautuneet: {virheet.erot}
          </p>
        )}

        {erot && erot.length === 0 && !virheet.erot && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, fontStyle: 'italic' }}>
            Ei eroja — Kehitys ja Live ovat samalla commitilla.
          </p>
        )}

        {erot && erot.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {erot.map((c) => (
              <li key={c.sha} style={{
                display:      'grid',
                gridTemplateColumns: '90px 1fr 130px 70px',
                gap:          '10px',
                alignItems:   'center',
                fontSize:     '13px',
                padding:      '8px 10px',
                background:   '#fef3c7',
                borderRadius: '6px',
                border:       '1px solid #fcd34d',
              }}>
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1D9E75', textDecoration: 'none' }}
                >
                  {lyhytSha(c.sha)}
                </a>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.viesti}>
                  {c.viesti}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{muotoilePvm(c.pvm)}</span>
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right', textDecoration: 'none' }}
                >
                  Diff ↗
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* D3: Siirrä Liveen -nappi (näkyy enabledina vain Kehityksessä) */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
            {omaYmparisto !== YMPARISTO.KEHITYS
              ? <>🚀 Siirrä Liveen toimii vain Kehitys-ympäristöstä.<br />Vaihda kehokorjaamo-kehitys.vercel.app:iin.</>
              : <>Klikkaus avaa vahvistusmodaalin (3 checkboxia + commit-lista).<br />Edge Function tekee GitHub-mergen, Vercel deployaa Liven automaattisesti.</>}
          </p>
          <button
            type="button"
            onClick={() => setSiirraModaaliAuki(true)}
            disabled={!onEroja || omaYmparisto !== YMPARISTO.KEHITYS}
            style={{
              padding:      '10px 18px',
              minHeight:    '40px',
              borderRadius: '10px',
              border:       'none',
              background:   onEroja && omaYmparisto === YMPARISTO.KEHITYS ? '#1D9E75' : '#9ca3af',
              color:        'white',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       onEroja && omaYmparisto === YMPARISTO.KEHITYS ? 'pointer' : 'not-allowed',
              opacity:      onEroja && omaYmparisto === YMPARISTO.KEHITYS ? 1 : 0.5,
            }}
          >
            🚀 Siirrä Liveen ({eroaKpl})
          </button>
        </div>
      </div>

      {/* D5: Rollback-osio */}
      {omaYmparisto === YMPARISTO.KEHITYS && (
        <div style={{
          background:   'white',
          border:       '1px solid #fecaca',
          borderRadius: '12px',
          padding:      '12px 14px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          '12px',
          flexWrap:     'wrap',
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
            <strong style={{ color: '#dc2626' }}>↩ Rollback:</strong> palauta edellinen Live-versio jos viimeisin julkaisu rikkoi jotain. Vain Vercel-deploy peruutetaan — DB-muutokset säilyvät.
          </p>
          <button
            type="button"
            onClick={() => setRollbackModaaliAuki(true)}
            style={{
              padding:      '8px 14px',
              borderRadius: '8px',
              border:       '1px solid #fecaca',
              background:   'white',
              color:        '#dc2626',
              fontSize:     '13px',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            ↩ Palauta edellinen Live-versio
          </button>
        </div>
      )}

      {/* D3 + D5: julkaisut-loki (vain Kehityksessä, missä Edge Function on) */}
      {omaYmparisto === YMPARISTO.KEHITYS && julkaisut && julkaisut.length > 0 && (
        <div style={{
          background:   'white',
          border:       '1px solid #e5e7eb',
          borderRadius: '12px',
          padding:      '14px 16px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
            Viimeisimmät julkaisut
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {julkaisut.map((j) => (
              <li key={j.id} style={{
                display:      'grid',
                gridTemplateColumns: '90px 90px 1fr 90px',
                gap:          '10px',
                alignItems:   'baseline',
                fontSize:     '12px',
                padding:      '6px 8px',
                borderRadius: '6px',
                background:   j.status === 'epaonnistui' ? '#fef2f2' : j.status === 'kaynnissa' ? '#fffbeb' : '#f0fdf4',
              }}>
                <span style={{ fontWeight: 600, color: j.toiminto === 'rollback' ? '#dc2626' : '#1D9E75' }}>
                  {j.toiminto === 'rollback' ? '↩ Rollback' : '🚀 Siirto'}
                </span>
                <span style={{ color: j.status === 'epaonnistui' ? '#991b1b' : j.status === 'kaynnissa' ? '#78350f' : '#166534' }}>
                  {j.status}
                </span>
                <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.virhe || `${(j.julkaistut_commitit ?? []).length} committia`}>
                  {j.virhe ?? `${(j.julkaistut_commitit ?? []).length} commit${(j.julkaistut_commitit ?? []).length === 1 ? '' : 'tia'}`}
                </span>
                <span style={{ color: '#9ca3af', textAlign: 'right' }}>
                  {muotoilePvm(j.luotu)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modaalit */}
      {siirraModaaliAuki && (
        <SiirraLiveenModaali
          erot={erot ?? []}
          onSulje={() => setSiirraModaaliAuki(false)}
          onValmis={() => {
            setSiirraModaaliAuki(false)
            lataa()
            lataaJulkaisut()
          }}
        />
      )}
      {rollbackModaaliAuki && (
        <RollbackModaali
          liveCommit={liveCommit}
          onSulje={() => setRollbackModaaliAuki(false)}
          onValmis={() => {
            setRollbackModaaliAuki(false)
            lataa()
            lataaJulkaisut()
          }}
        />
      )}
    </div>
  )
}
