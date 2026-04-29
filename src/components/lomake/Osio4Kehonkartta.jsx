// Osio 4 — Asiakkaan kehonkartta
// Sijainti repossa: src/components/lomake/Osio4Kehonkartta.jsx
//
// Mitä tämä tekee:
// - Näyttää 4 hahmoa rinnakkain (Kaikki-näkymä) tai yksitellen zoomattuna
// - Asiakas valitsee oiretyypin neliön muotoisilla napeilla (1=Kipu, 2=Lihasjännitys jne.)
// - Asiakas piirtää sormella tai hiirellä alueet joissa tuntee oireita
// - Värit sekoittuvat päällekkäisillä alueilla (visuaalinen vihje hoitajalle)
// - Vyöhyke-tunnistus laskee mitkä 76 vyöhykepistettä jäävät piirron alle
// - Vahinkokosketukset hylätään (alle 80ms kosketus = ei tallenneta)
// - Kumoa-toiminto korvaa confirm()-popupit
// - Tallentaa: kuvana (canvas → PNG dataURL) + vyöhyke-yhteenveto JSON
//
// Controlled component: vanhempi-komponentti hallitsee tilaa.

import { useEffect, useRef, useState } from 'react';
import { KEHON_VYOHYKKEET } from '../../data/kehonVyohykkeet';

// SVG/canvas-mitat (sama viewBox kuin hahmokuvat.svg)
const CANVAS_LEVEYS = 1471;
const CANVAS_KORKEUS = 1069;

// Siveltimen koko (pikseleinä canvasilla)
const SIVELLIN_KOKO = 60;

// Vyöhyke-pisteen vaikutusalue tunnistuksessa
const VYOHYKKEEN_SADE = 80;

// Vahinkokosketuksen kynnys (ms) — alle tämän kestoiset kosketukset hylätään
const VAHINKO_KYNNYS_MS = 80;

// Oiretyypit
const OIRETYYPIT = [
  { id: 'kipu',          numero: 1, nimi: 'Kipu',          vari: '#ef4444' },
  { id: 'lihasjannitys', numero: 2, nimi: 'Lihasjännitys', vari: '#f97316' },
  { id: 'puutuminen',    numero: 3, nimi: 'Puutuminen',    vari: '#3b82f6' },
  { id: 'tunnottomuus',  numero: 4, nimi: 'Tunnottomuus',  vari: '#9ca3af' },
];

// Hahmovaihtoehdot (toistaiseksi vain nainen)
const HAHMOVAIHTOEHDOT = [
  { id: 'nainen', nimi: 'Nainen', svg: '/hahmokuvat.svg' },
];

// Näkymät — määrittelee mikä osa hahmukuvasta näytetään
// Hahmojen koordinaatit SVG:ssä (1471 × 1069):
//   Sivu vasen: x 144-272 (keskilinja 208)
//   Taka:       x 380-676 (keskilinja 528)
//   Etu:        x 760-1052 (keskilinja 906)
//   Sivu oikea: x 1164-1292 (keskilinja 1228)
const NAKYMAT = [
  { id: 'kaikki', nimi: 'Kaikki',   viewBox: '0 0 1471 1069' },
  { id: 'etu',    nimi: 'Edestä',   viewBox: '720 0 380 870' },
  { id: 'taka',   nimi: 'Takaa',    viewBox: '340 0 380 870' },
  { id: 'sivut',  nimi: 'Sivuilta', viewBox: '100 0 1230 870' },
];

export default function Osio4Kehonkartta({
  arvo = { merkinnat: {}, vedot: [], kuva: null, hahmo: 'nainen' },
  onMuutos = () => {},
}) {
  // Null-suoja
  const merkinnat = arvo?.merkinnat ?? {};
  const vedot = arvo?.vedot ?? [];
  const valittuHahmo = arvo?.hahmo ?? 'nainen';

  // Lokaali tila
  const [valittuOire, setValittuOire] = useState('kipu');
  const [valittuNakyma, setValittuNakyma] = useState('kaikki');
  const [piirretaan, setPiirretaan] = useState(false);

  // Kumoa-ilmoitus tyhjennysten jälkeen (5 sek näkyvä)
  const [kumottava, setKumottava] = useState(null); // { teksti, edellisetVedot }

  // Refs
  const canvasRef = useRef(null);
  const piirtoKontekstiRef = useRef(null);
  const nykyinenVetoRef = useRef([]);
  const piirronAloitusAikaRef = useRef(0);
  const kumotaTimeoutRef = useRef(null);

  // Alusta canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    piirtoKontekstiRef.current = ctx;
    piirraVedotUudelleen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Päivitä canvas kun vedot muuttuvat
  useEffect(() => {
    piirraVedotUudelleen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vedot.length, valittuHahmo]);

  // Piirrä kaikki vedot uudelleen
  function piirraVedotUudelleen() {
    const ctx = piirtoKontekstiRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_LEVEYS, CANVAS_KORKEUS);
    vedot.forEach(veto => piirraVeto(ctx, veto));
  }

  function piirraVeto(ctx, veto) {
    if (veto.pisteet.length === 0) return;
    const oire = OIRETYYPIT.find(o => o.id === veto.oire);
    if (!oire) return;

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = oire.vari;
    ctx.fillStyle = oire.vari;
    ctx.lineWidth = SIVELLIN_KOKO;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(veto.pisteet[0].x, veto.pisteet[0].y);
    for (let i = 1; i < veto.pisteet.length; i++) {
      ctx.lineTo(veto.pisteet[i].x, veto.pisteet[i].y);
    }
    ctx.stroke();

    if (veto.pisteet.length === 1) {
      ctx.beginPath();
      ctx.arc(veto.pisteet[0].x, veto.pisteet[0].y, SIVELLIN_KOKO / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Muunna sijainti canvas-koordinaateiksi
  function canvasKoordinaatit(tapahtuma) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const koskettaja = tapahtuma.touches?.[0] ?? tapahtuma;

    // Otetaan huomioon näkymän viewBox (zoom)
    const nakyma = NAKYMAT.find(n => n.id === valittuNakyma) ?? NAKYMAT[0];
    const [vbX, vbY, vbW, vbH] = nakyma.viewBox.split(' ').map(Number);

    const skaalaX = vbW / rect.width;
    const skaalaY = vbH / rect.height;

    return {
      x: (koskettaja.clientX - rect.left) * skaalaX + vbX,
      y: (koskettaja.clientY - rect.top) * skaalaY + vbY,
    };
  }

  function aloitaPiirto(tapahtuma) {
    tapahtuma.preventDefault();
    setPiirretaan(true);
    piirronAloitusAikaRef.current = Date.now();
    const piste = canvasKoordinaatit(tapahtuma);
    nykyinenVetoRef.current = [piste];

    const ctx = piirtoKontekstiRef.current;
    if (!ctx) return;
    const oire = OIRETYYPIT.find(o => o.id === valittuOire);
    if (!oire) return;

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = oire.vari;
    ctx.beginPath();
    ctx.arc(piste.x, piste.y, SIVELLIN_KOKO / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function jatkaPiirtoa(tapahtuma) {
    if (!piirretaan) return;
    tapahtuma.preventDefault();

    const piste = canvasKoordinaatit(tapahtuma);
    const edellinen = nykyinenVetoRef.current[nykyinenVetoRef.current.length - 1];
    nykyinenVetoRef.current.push(piste);

    const ctx = piirtoKontekstiRef.current;
    if (!ctx || !edellinen) return;

    const oire = OIRETYYPIT.find(o => o.id === valittuOire);
    if (!oire) return;

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = oire.vari;
    ctx.lineWidth = SIVELLIN_KOKO;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(edellinen.x, edellinen.y);
    ctx.lineTo(piste.x, piste.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function lopetaPiirto() {
    if (!piirretaan) return;
    setPiirretaan(false);

    const kesto = Date.now() - piirronAloitusAikaRef.current;
    const veto = {
      oire: valittuOire,
      pisteet: [...nykyinenVetoRef.current],
    };
    nykyinenVetoRef.current = [];

    if (veto.pisteet.length === 0) return;

    // Hylkää vahinkokosketukset (lyhyt + yksittäinen piste)
    if (kesto < VAHINKO_KYNNYS_MS && veto.pisteet.length === 1) {
      // Pyyhi se piste pois canvasilta
      piirraVedotUudelleen();
      return;
    }

    const uudetVedot = [...vedot, veto];
    const uudetMerkinnat = laskeMerkinnat(uudetVedot);
    const kuva = canvasRef.current?.toDataURL('image/png') ?? null;

    onMuutos({
      ...arvo,
      vedot: uudetVedot,
      merkinnat: uudetMerkinnat,
      kuva,
      hahmo: valittuHahmo,
    });
  }

  function laskeMerkinnat(vedotLista) {
    const tulos = {};
    vedotLista.forEach(veto => {
      veto.pisteet.forEach(piste => {
        KEHON_VYOHYKKEET.forEach(vyohyke => {
          const dx = piste.x - vyohyke.cx;
          const dy = piste.y - vyohyke.cy;
          const etaisyys = Math.sqrt(dx * dx + dy * dy);
          if (etaisyys <= VYOHYKKEEN_SADE) {
            if (!tulos[vyohyke.id]) tulos[vyohyke.id] = [];
            if (!tulos[vyohyke.id].includes(veto.oire)) {
              tulos[vyohyke.id].push(veto.oire);
            }
          }
        });
      });
    });
    return tulos;
  }

  // Kumoa viimeinen veto
  function kumoaVeto() {
    if (vedot.length === 0) return;
    const uudetVedot = vedot.slice(0, -1);
    const uudetMerkinnat = laskeMerkinnat(uudetVedot);
    onMuutos({
      ...arvo,
      vedot: uudetVedot,
      merkinnat: uudetMerkinnat,
      kuva: null,
    });
  }

  // Tyhjennä kaikki — ei popup, vaan tehdään heti + näytetään kumoa-ilmoitus
  function tyhjenna() {
    if (vedot.length === 0) return;
    const edellisetVedot = vedot;
    onMuutos({
      ...arvo,
      vedot: [],
      merkinnat: {},
      kuva: null,
    });
    naytaKumoa('Kaikki merkinnät tyhjennetty', edellisetVedot);
  }

  // Tyhjennä valittu oire — ei popup
  function tyhjennaOire() {
    const valitunVedot = vedot.filter(v => v.oire === valittuOire);
    if (valitunVedot.length === 0) return;

    const valitunNimi = OIRETYYPIT.find(o => o.id === valittuOire)?.nimi ?? '';
    const edellisetVedot = vedot;
    const uudetVedot = vedot.filter(v => v.oire !== valittuOire);
    const uudetMerkinnat = laskeMerkinnat(uudetVedot);

    onMuutos({
      ...arvo,
      vedot: uudetVedot,
      merkinnat: uudetMerkinnat,
      kuva: null,
    });
    naytaKumoa(`${valitunNimi} tyhjennetty`, edellisetVedot);
  }

  // Näytä kumoa-ilmoitus 5 sekuntia
  function naytaKumoa(teksti, edellisetVedot) {
    if (kumotaTimeoutRef.current) {
      clearTimeout(kumotaTimeoutRef.current);
    }
    setKumottava({ teksti, edellisetVedot });
    kumotaTimeoutRef.current = setTimeout(() => {
      setKumottava(null);
    }, 5000);
  }

  // Palauta tyhjennetyt vedot
  function kumoaTyhjennys() {
    if (!kumottava) return;
    const palautetutVedot = kumottava.edellisetVedot;
    const uudetMerkinnat = laskeMerkinnat(palautetutVedot);
    onMuutos({
      ...arvo,
      vedot: palautetutVedot,
      merkinnat: uudetMerkinnat,
      kuva: null,
    });
    setKumottava(null);
    if (kumotaTimeoutRef.current) clearTimeout(kumotaTimeoutRef.current);
  }

  const aktiivinenHahmo = HAHMOVAIHTOEHDOT.find(h => h.id === valittuHahmo) ?? HAHMOVAIHTOEHDOT[0];
  const aktiivinenNakyma = NAKYMAT.find(n => n.id === valittuNakyma) ?? NAKYMAT[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">

      {/* Otsikko + ohje */}
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          Kehon merkinnät
        </h2>
        <p className="text-sm text-gray-500">
          Valitse oiretyyppi ja piirrä sormella tai hiirellä alueet joissa tunnet oireita
        </p>
      </div>

      {/* Hahmovalinta — näkyy vain jos useita */}
      {HAHMOVAIHTOEHDOT.length > 1 && (
        <div className="mb-3 flex gap-2">
          {HAHMOVAIHTOEHDOT.map(h => (
            <button
              key={h.id}
              onClick={() => onMuutos({ ...arvo, hahmo: h.id })}
              className={`px-4 py-2 text-sm font-medium rounded-md border ${
                valittuHahmo === h.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {h.nimi}
            </button>
          ))}
        </div>
      )}

      {/* Oiretyypit — neliön muotoiset napit kuten kuvassa */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {OIRETYYPIT.map(oire => {
          const onValittu = valittuOire === oire.id;
          return (
            <button
              key={oire.id}
              type="button"
              onClick={() => setValittuOire(oire.id)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-white"
              style={{
                borderColor: onValittu ? oire.vari : '#e5e7eb',
                borderWidth: onValittu ? '2px' : '1px',
                minHeight: '88px',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: oire.vari,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {oire.numero}
              </div>
              <span className="text-sm font-medium text-gray-700">{oire.nimi}</span>
            </button>
          );
        })}
      </div>

      {/* Näkymänvaihto */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {NAKYMAT.map(nakyma => {
          const onValittu = valittuNakyma === nakyma.id;
          return (
            <button
              key={nakyma.id}
              type="button"
              onClick={() => setValittuNakyma(nakyma.id)}
              className="px-3 py-1.5 text-sm font-medium rounded-md border"
              style={{
                borderColor: onValittu ? '#3b82f6' : '#e5e7eb',
                background: onValittu ? '#eff6ff' : 'white',
                color: onValittu ? '#1e40af' : '#374151',
              }}
            >
              {nakyma.nimi}
            </button>
          );
        })}
      </div>

      {/* Piirtoalue */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#f9fafb',
        }}
      >
        <svg
          viewBox={aktiivinenNakyma.viewBox}
          style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
        >
          <image
            href={aktiivinenHahmo.svg}
            x="0"
            y="0"
            width={CANVAS_LEVEYS}
            height={CANVAS_KORKEUS}
          />
        </svg>
        <canvas
          ref={canvasRef}
          width={CANVAS_LEVEYS}
          height={CANVAS_KORKEUS}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={aloitaPiirto}
          onMouseMove={jatkaPiirtoa}
          onMouseUp={lopetaPiirto}
          onMouseLeave={lopetaPiirto}
          onTouchStart={aloitaPiirto}
          onTouchMove={jatkaPiirtoa}
          onTouchEnd={lopetaPiirto}
        />
      </div>

      {/* Kumoa-ilmoitus tyhjennysten jälkeen */}
      {kumottava && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 14,
            color: '#15803d',
          }}
        >
          <span>✓ {kumottava.teksti}</span>
          <button
            onClick={kumoaTyhjennys}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#15803d',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Kumoa
          </button>
        </div>
      )}

      {/* Toiminnot */}
      <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={kumoaVeto}
            disabled={vedot.length === 0}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
          >
            ↶ Peru viimeinen
          </button>
          <button
            type="button"
            onClick={tyhjennaOire}
            disabled={vedot.filter(v => v.oire === valittuOire).length === 0}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
          >
            Tyhjennä valittu oire
          </button>
          <button
            type="button"
            onClick={tyhjenna}
            disabled={vedot.length === 0}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
          >
            Tyhjennä kaikki
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {Object.keys(merkinnat).length > 0 ? (
            <>Merkitty {Object.keys(merkinnat).length} / {KEHON_VYOHYKKEET.length} aluetta</>
          ) : (
            <>Ei merkintöjä</>
          )}
        </div>
      </div>
    </div>
  );
}
