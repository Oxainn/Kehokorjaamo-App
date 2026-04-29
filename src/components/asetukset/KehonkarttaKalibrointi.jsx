// Kehonkartta-kalibrointi
// Sijainti repossa: src/components/asetukset/KehonkarttaKalibrointi.jsx
//
// Mitä tämä tekee:
// - Näyttää SVG-hahmot (4 hahmoa) ja päällä kaikki 76 vyöhyke-pistettä
// - Hoitaja voi vetää sormella tai hiirellä jokaisen pisteen oikeaan paikkaan
// - Valittu vyöhyke korostuu, lista oikealla näyttää kaikki ja niiden tilan
// - "Tulosta päivitetty koodi" -nappi näyttää uuden kehonVyohykkeet.js-sisällön
//   joka kopioidaan tiedostoon
//
// Tämä on yhden kerran tehtävä työkalu — kun kalibrointi on tehty,
// tätä käytetään vain uusien hahmojen lisäyksessä (mies, lapsi jne.)

import { useState, useRef } from 'react';
import { KEHON_VYOHYKKEET, vyohykkeenNayttonimi } from '../../data/kehonVyohykkeet';

const SVG_LEVEYS = 1471;
const SVG_KORKEUS = 1069;
const PISTEEN_SADE = 12;
const PISTEEN_SADE_VALITTU = 18;

export default function KehonkarttaKalibrointi() {
  // Pisteiden tila — alustetaan alkuperäisillä koordinaateilla
  const [vyohykkeet, setVyohykkeet] = useState(() =>
    KEHON_VYOHYKKEET.map(v => ({ ...v, muokattu: false }))
  );

  // Valittu vyöhyke (id)
  const [valittuId, setValittuId] = useState(null);

  // Vetämisen tila
  const [vedettavaId, setVedettavaId] = useState(null);

  // Suodatus listalla
  const [suodatin, setSuodatin] = useState('kaikki'); // 'kaikki' | 'muokatut' | 'sijoittamatta'

  // Tulosta-modaalin näkyvyys
  const [naytaTulostus, setNaytaTulostus] = useState(false);

  // Ref SVG-elementtiin koordinaattimuunnosta varten
  const svgRef = useRef(null);

  // Muunna hiiren/sormen sijainti SVG-koordinaateiksi
  function svgKoordinaatit(tapahtuma) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const piste = svg.createSVGPoint();
    // Tuetaan sekä hiiri- että kosketus-tapahtumia
    const koskettaja = tapahtuma.touches?.[0] ?? tapahtuma;
    piste.x = koskettaja.clientX;
    piste.y = koskettaja.clientY;

    const muunnos = svg.getScreenCTM()?.inverse();
    if (!muunnos) return { x: 0, y: 0 };

    const muunnettu = piste.matrixTransform(muunnos);
    return { x: muunnettu.x, y: muunnettu.y };
  }

  // Aloita pisteen veto
  function aloitaVeto(id, tapahtuma) {
    tapahtuma.preventDefault();
    setVedettavaId(id);
    setValittuId(id);
  }

  // Päivitä pisteen sijainti vetämisen aikana
  function vedaPiste(tapahtuma) {
    if (!vedettavaId) return;
    tapahtuma.preventDefault();

    const { x, y } = svgKoordinaatit(tapahtuma);
    setVyohykkeet(prev =>
      prev.map(v =>
        v.id === vedettavaId
          ? { ...v, cx: Math.round(x), cy: Math.round(y), muokattu: true }
          : v
      )
    );
  }

  // Lopeta veto
  function lopetaVeto() {
    setVedettavaId(null);
  }

  // Klikkaa lista-itemiä → valitse piste
  function valitse(id) {
    setValittuId(id);
  }

  // Nollaa kaikki muutokset
  function nollaaMuutokset() {
    if (!confirm('Nollaa kaikki tehdyt muutokset?')) return;
    setVyohykkeet(KEHON_VYOHYKKEET.map(v => ({ ...v, muokattu: false })));
    setValittuId(null);
  }

  // Suodatettu lista oikealle paneelille
  const suodatetut = vyohykkeet.filter(v => {
    if (suodatin === 'muokatut') return v.muokattu;
    if (suodatin === 'sijoittamatta') return !v.muokattu;
    return true;
  });

  const muokattujenMaara = vyohykkeet.filter(v => v.muokattu).length;

  // Tulosta päivitetty kehonVyohykkeet.js-sisältö
  function tulostaKoodi() {
    const rivit = vyohykkeet.map(v => {
      const teknBlock = v.tekninen ? `'${v.tekninen}'` : `''`;
      return `  { id: '${v.id}', puoli: '${v.puoli}', nimi: '${v.nimi}', tekninen: ${teknBlock}, cx: ${v.cx}, cy: ${v.cy} },`;
    }).join('\n');

    return `// Päivitetyt koordinaatit — kopioi KEHON_VYOHYKKEET-listan sisältö tähän:\n\nexport const KEHON_VYOHYKKEET = [\n${rivit}\n];\n`;
  }

  return (
    <div style={{ display: 'flex', gap: '16px', height: '70vh' }}>

      {/* Vasen: SVG + pisteet */}
      <div style={{
        flex: '1 1 70%',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: '#f9fafb',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_LEVEYS} ${SVG_KORKEUS}`}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseMove={vedaPiste}
          onMouseUp={lopetaVeto}
          onMouseLeave={lopetaVeto}
          onTouchMove={vedaPiste}
          onTouchEnd={lopetaVeto}
        >
          {/* Hahmukuvat taustana */}
          <image
            href="/hahmokuvat.svg"
            x="0"
            y="0"
            width={SVG_LEVEYS}
            height={SVG_KORKEUS}
          />

          {/* Vyöhyke-pisteet päällä */}
          {vyohykkeet.map(v => {
            const onValittu = v.id === valittuId;
            const sade = onValittu ? PISTEEN_SADE_VALITTU : PISTEEN_SADE;
            const tayte = v.muokattu ? '#10b981' : '#f59e0b';
            const reuna = onValittu ? '#1e40af' : 'white';
            const reunanLeveys = onValittu ? 4 : 2;
            return (
              <g key={v.id}>
                <circle
                  cx={v.cx}
                  cy={v.cy}
                  r={sade}
                  fill={tayte}
                  stroke={reuna}
                  strokeWidth={reunanLeveys}
                  style={{ cursor: 'grab' }}
                  onMouseDown={(t) => aloitaVeto(v.id, t)}
                  onTouchStart={(t) => aloitaVeto(v.id, t)}
                />
                {onValittu && (
                  <text
                    x={v.cx}
                    y={v.cy - sade - 10}
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="500"
                    fill="#1e40af"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {v.nimi}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Oikea: lista vyöhykkeistä */}
      <div style={{
        flex: '0 0 320px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: 'white',
        overflow: 'hidden'
      }}>
        {/* Yläpalkki: tilastot ja suodatus */}
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            <strong>{muokattujenMaara}</strong> / {vyohykkeet.length} sijoitettu
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { arvo: 'kaikki', teksti: 'Kaikki' },
              { arvo: 'muokatut', teksti: 'Sijoitetut' },
              { arvo: 'sijoittamatta', teksti: 'Vielä' },
            ].map(s => (
              <button
                key={s.arvo}
                onClick={() => setSuodatin(s.arvo)}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background: suodatin === s.arvo ? '#eff6ff' : 'white',
                  borderColor: suodatin === s.arvo ? '#3b82f6' : '#e5e7eb',
                  color: suodatin === s.arvo ? '#1e40af' : '#111827',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {s.teksti}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {suodatetut.map(v => {
            const onValittu = v.id === valittuId;
            return (
              <button
                key={v.id}
                onClick={() => valitse(v.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  background: onValittu ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: v.muokattu ? '#10b981' : '#f59e0b',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: onValittu ? 500 : 400,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {vyohykkeenNayttonimi(v)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {v.puoli}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alanapit */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={() => setNaytaTulostus(true)}
            style={{
              padding: '10px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tulosta päivitetty koodi
          </button>
          <button
            onClick={nollaaMuutokset}
            style={{
              padding: '8px',
              background: 'white',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Nollaa muutokset
          </button>
        </div>
      </div>

      {/* Tulostus-modaali */}
      {naytaTulostus && (
        <div
          onClick={() => setNaytaTulostus(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 500 }}>
              Päivitetty koodi
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280' }}>
              Kopioi alla oleva sisältö ja korvaa sillä KEHON_VYOHYKKEET-lista
              tiedostossa src/data/kehonVyohykkeet.js
            </p>
            <textarea
              readOnly
              value={tulostaKoodi()}
              style={{
                flex: 1,
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                resize: 'none',
                minHeight: '300px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tulostaKoodi());
                  alert('Kopioitu leikepöydälle');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Kopioi leikepöydälle
              </button>
              <button
                onClick={() => setNaytaTulostus(false)}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Sulje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
