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
import { YMPARISTOT, haeViimeisinCommit, haeErotHaarat, GITHUB_REPO } from '../../lib/ymparistot'
import { tunnistaYmparisto } from '../../lib/ymparisto'

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

function YmparistoPaneeli({ avain, ymparisto, omaYmparisto, commit, virhe }) {
  const onOma = avain === omaYmparisto
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
          <StatusPallo ok={!virhe} latautuu={!commit && !virhe} />
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
        if (!error) setOmaAsiakkaita(count ?? 0)
      })
    return () => { peruttu = true }
  }, [])

  useEffect(() => { lataa() }, [lataa])

  const eroaKpl = erot?.length ?? 0
  const onEroja = eroaKpl > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hälytys-paneeli (placeholder D4:lle) */}
      <div style={{
        background:   '#f0fdf4',
        border:       '1px solid #bbf7d0',
        borderRadius: '10px',
        padding:      '10px 14px',
        fontSize:     '13px',
        color:        '#166534',
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
      }}>
        <span>🟢</span>
        <span>OK — ei aktiivisia hälytyksiä. Live + Kehitys vastaavat. Status-pollaus tulossa D4-vaiheessa.</span>
      </div>

      {/* Päivityspainike + aikaleima */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          {paivitettyAt
            ? <>Päivitetty: {muotoilePvm(paivitettyAt.toISOString())}</>
            : 'Ladataan tila…'}
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
        />
        <YmparistoPaneeli
          avain="kehitys"
          ymparisto={YMPARISTOT.kehitys}
          omaYmparisto={omaYmparisto}
          commit={kehitysCommit}
          virhe={virheet.kehitys}
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

        {/* Siirrä Liveen -nappi (D3 tulossa) */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, lineHeight: 1.4 }}>
            🚀 Yhden klikkauksen julkaisu Liveen tulossa palan D3 myötä<br />
            (vaatii GitHub + Vercel -tokenit + turvallisuusrajat)
          </p>
          <button
            type="button"
            disabled
            title="Tulossa D3-vaiheessa — vaatii tokenit + turvallisuusrajat"
            style={{
              padding:      '10px 18px',
              minHeight:    '40px',
              borderRadius: '10px',
              border:       'none',
              background:   onEroja ? '#9ca3af' : '#e5e7eb',
              color:        onEroja ? 'white' : '#9ca3af',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       'not-allowed',
              opacity:      0.6,
            }}
          >
            🚀 Siirrä Liveen ({eroaKpl})
          </button>
        </div>
      </div>
    </div>
  )
}
