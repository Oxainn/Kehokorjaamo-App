// TILAPÄINEN — renderöijän testaus. Poistetaan kun renderöijä korvaa Asiakastietolomakkeen.
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { tallennaRenderoijastaLomake } from '../lib/db'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

export default function LomakeRenderoijaTesti() {
  const [pohjat,     setPohjat]     = useState([])
  const [pohjaId,    setPohjaId]    = useState(null)
  const [vastaukset, setVastaukset] = useState({})
  const [tallennus,  setTallennus]  = useState(null) // null | 'tallentaa' | { onnistui: bool, viesti, asiakasId, lomakeVersioId, versioNro }
  const [lataa,      setLataa]      = useState(true)
  const [virhe,      setVirhe]      = useState(null)

  useEffect(() => {
    let peruttu = false
    setLataa(true)
    supabase
      .from('lomakepohjat')
      .select('id, nimi, on_oletus, aktiivinen, lomakepohja_versiot(versio, rakenne)')
      .eq('aktiivinen', true)
      .order('on_oletus', { ascending: false })
      .then(({ data, error }) => {
        if (peruttu) return
        if (error) { setVirhe(error.message); setLataa(false); return }
        const rikastetut = (data ?? []).map((p) => {
          const v = (p.lomakepohja_versiot ?? []).slice().sort((a, b) => b.versio - a.versio)[0]
          return { id: p.id, nimi: p.nimi, on_oletus: p.on_oletus, nayttotyyli: v?.rakenne?.nayttotyyli ?? '—' }
        })
        setPohjat(rikastetut)
        const valittu = rikastetut.find((p) => p.on_oletus) ?? rikastetut[0]
        setPohjaId(valittu?.id ?? null)
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [])

  function tyhjenna() {
    setVastaukset({})
    setTallennus(null)
  }

  async function tallenna(arvot) {
    setTallennus('tallentaa')
    try {
      const tulos = await tallennaRenderoijastaLomake({ vastaukset: arvot })
      if (tulos.virhe) {
        setTallennus({ onnistui: false, viesti: tulos.virhe })
        return
      }
      setTallennus({
        onnistui:       true,
        viesti:         'Lomake tallennettu',
        asiakasId:      tulos.asiakasId,
        lomakeVersioId: tulos.lomakeVersioId,
        versioNro:      tulos.versioNro,
      })
    } catch (e) {
      setTallennus({ onnistui: false, viesti: e.message ?? 'Tuntematon virhe' })
    }
  }

  if (lataa) return <div style={{ padding: '24px', color: '#6b7280' }}>Ladataan pohjia…</div>
  if (virhe) return <div style={{ padding: '24px', color: '#b91c1c' }}>Virhe: {virhe}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header — selitys + valikko */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#78350f' }}>
        <strong>🧪 Tilapäinen testinäkymä</strong>
        <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>
          22 kenttätyyppiä, 3 näyttötyyliä, validointi ja tallennus tietokantaan toimivat.
          LÄHETÄ-painike tallentaa asiakkaaksi <code>asiakkaat</code>-tauluun + lomakeversion <code>asiakastietolomake_versiot</code>-tauluun
          (tunnistamattomat kentät <code>lisakentat</code>-jsonb:in) + sairaudet <code>lomake_sairaudet</code>-tauluun.
        </p>
      </div>

      {/* Pohjan valinta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Pohja:</label>
        <select
          value={pohjaId ?? ''}
          onChange={(e) => { setPohjaId(e.target.value); tyhjenna() }}
          style={{
            padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '14px', color: '#111827', background: 'white', minWidth: '260px',
          }}
        >
          {pohjat.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nimi} ({p.nayttotyyli}){p.on_oletus ? ' ⭐' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={tyhjenna}
          style={{
            padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            background: 'white', color: '#374151', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Tyhjennä
        </button>
      </div>

      {/* Tallennuksen tila */}
      {tallennus === 'tallentaa' && (
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#1e3a8a' }}>
          Tallennetaan…
        </div>
      )}
      {tallennus && tallennus !== 'tallentaa' && tallennus.onnistui && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#065f46' }}>
          <strong>✓ {tallennus.viesti}</strong>
          <p style={{ margin: '4px 0 0 0', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '12px' }}>
            asiakas_id: {tallennus.asiakasId}<br />
            lomake_versio_id: {tallennus.lomakeVersioId}<br />
            versio_nro: {tallennus.versioNro ?? '—'}
          </p>
        </div>
      )}
      {tallennus && tallennus !== 'tallentaa' && !tallennus.onnistui && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#991b1b' }}>
          <strong>✗ Tallennus epäonnistui</strong>
          <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>{tallennus.viesti}</p>
        </div>
      )}

      {/* Renderöijä */}
      <LomakeRenderoija
        pohjaId={pohjaId}
        vastaukset={vastaukset}
        onMuutos={setVastaukset}
        onLahetys={tallenna}
      />

      {/* Debug — vastaukset live */}
      <details style={{ background: '#1f2937', color: '#d1d5db', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace' }}>
        <summary style={{ cursor: 'pointer', color: '#9ca3af', fontFamily: 'inherit' }}>
          Debug — nykyiset vastaukset
        </summary>
        <pre style={{ margin: '8px 0 0 0', overflow: 'auto' }}>
{JSON.stringify(vastaukset, null, 2)}
        </pre>
      </details>

    </div>
  )
}
