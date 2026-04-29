// Osio 3 — Hoitoon tulon syy
// Sijainti repossa: src/components/lomake/Osio3HoitoonTulonSyy.jsx
//
// Mitä tämä tekee:
// - Pakollinen tekstikenttä asiakkaan oireiden ja tilanteen kuvaukseen
// - Apukysymykset näkyvät kentän alla, haalistuvat kun käyttäjä kirjoittaa
// - Kipuasteikko 0-10 värikoodattuna (vihreä → keltainen → punainen)
// - Kipuasteikossa sekä liukusäädin että klikattavat numerot 0-10
//
// Controlled component: vanhempi-komponentti hallitsee tilaa.
// Tämä komponentti ottaa propsit `arvo` ja `onMuutos`, ei tiedä Supabasesta.
// Tallennuslogiikka tehdään myöhemmin vanhempi-komponentissa.

import { useEffect, useRef } from 'react';

/**
 * Apufunktio: valitse väri kipuluvun mukaan.
 * 0-3 = vihreä (lievä), 4-6 = oranssi (kohtalainen), 7-10 = punainen (voimakas)
 */
function variKipuluvulle(luku) {
  if (luku <= 3) return '#3B6D11'; // vihreä
  if (luku <= 6) return '#BA7517'; // oranssi
  return '#A32D2D';                // punainen
}

/**
 * Apufunktio: laske apukysymysten läpinäkyvyys kuvauksen pituuden perusteella.
 * Tyhjä kenttä = täysi näkyvyys, pitkä teksti = haalistunut.
 */
function laskeApukysymystenLapinakyvyys(kuvaus) {
  const pituus = (kuvaus || '').length;
  if (pituus === 0) return 1;
  if (pituus < 80) return 0.55;
  return 0.3;
}

export default function Osio3HoitoonTulonSyy({
  // Propsit vanhemmalta — null-suojattu defaulteilla
  arvo = { kuvaus: '', kipuluku: 0 },
  onMuutos = () => {},
}) {
  // Null-suoja: jos arvo tulee tietokannasta vajaana, käytetään defaultteja
  const kuvaus = arvo?.kuvaus ?? '';
  const kipuluku = typeof arvo?.kipuluku === 'number' ? arvo.kipuluku : 0;

  // Ref tekstikenttään autoresize-toimintoa varten
  const tekstikenttaRef = useRef(null);

  // Kun kuvaus muuttuu, päivitetään tekstikentän korkeus sisällön mukaan.
  // Miksi useEffect: DOM-mittauksia tehdään aina renderin jälkeen.
  useEffect(() => {
    const elementti = tekstikenttaRef.current;
    if (!elementti) return;
    elementti.style.height = 'auto';
    elementti.style.height = Math.max(120, elementti.scrollHeight) + 'px';
  }, [kuvaus]);

  // Käsittelijä tekstikentän muutokselle
  function kasittele_kuvaus_muutos(tapahtuma) {
    onMuutos({ ...arvo, kuvaus: tapahtuma.target.value });
  }

  // Käsittelijä kipuluvun muutokselle (slider tai nappi)
  function kasittele_kipuluku_muutos(uusiLuku) {
    const turvallinenLuku = Math.max(0, Math.min(10, parseInt(uusiLuku, 10) || 0));
    onMuutos({ ...arvo, kipuluku: turvallinenLuku });
  }

  const kipuVari = variKipuluvulle(kipuluku);
  const apukysymystenLapinakyvyys = laskeApukysymystenLapinakyvyys(kuvaus);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">

      {/* Otsikkorivi */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          Hoitoon tulon syy
        </h2>
        <p className="text-sm text-gray-500">Osio 3 / 5</p>
      </div>

      {/* Tekstikenttä + apukysymykset */}
      <div className="mb-6">
        <label
          htmlFor="kuvaus"
          className="block text-sm font-medium text-gray-900 mb-2"
        >
          Oireiden ja tilanteen kuvaus
          <span className="text-red-600 ml-1">*</span>
        </label>

        <textarea
          ref={tekstikenttaRef}
          id="kuvaus"
          value={kuvaus}
          onChange={kasittele_kuvaus_muutos}
          placeholder="Kirjoita omin sanoin..."
          rows={4}
          className="w-full p-3 text-base leading-relaxed border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          style={{ minHeight: '120px', overflow: 'hidden' }}
        />

        {/* Apukysymykset — haalistuvat kun käyttäjä kirjoittaa */}
        <div
          className="mt-2.5 px-3.5 py-3 bg-gray-50 rounded-lg transition-opacity duration-300"
          style={{ opacity: apukysymystenLapinakyvyys }}
        >
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            Voit miettiä esim. näitä:
          </p>
          <ul className="text-sm text-gray-500 leading-relaxed pl-5 list-disc space-y-0.5">
            <li>Mitä oireita sinulla on?</li>
            <li>Kuinka kauan oireet ovat kestäneet?</li>
            <li>Mikä pahentaa tai helpottaa oloa?</li>
            <li>Mitä toivot tältä hoidolta?</li>
          </ul>
        </div>
      </div>

      {/* Kipuasteikko */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <label className="text-sm font-medium text-gray-900">
            Kipu nyt
          </label>
          <span
            className="text-3xl font-medium"
            style={{ color: kipuVari }}
          >
            {kipuluku} / 10
          </span>
        </div>

        {/* Liukusäädin värikoodatulla taustalla */}
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={kipuluku}
          onChange={(t) => kasittele_kipuluku_muutos(t.target.value)}
          className="w-full kipu-slider"
          style={{
            background:
              'linear-gradient(to right, #97C459 0%, #97C459 30%, #FAC775 30%, #FAC775 70%, #E24B4A 70%, #E24B4A 100%)',
          }}
        />

        {/* Klikattavat numerot 0-10 */}
        <div className="grid grid-cols-11 gap-1 mt-3">
          {Array.from({ length: 11 }, (_, indeksi) => {
            const numero = indeksi;
            const onAktiivinen = numero === kipuluku;
            return (
              <button
                key={numero}
                type="button"
                onClick={() => kasittele_kipuluku_muutos(numero)}
                className="h-9 text-sm font-medium rounded-md bg-white hover:bg-gray-50 transition"
                style={{
                  border: onAktiivinen
                    ? `2px solid ${kipuVari}`
                    : '0.5px solid #e5e7eb',
                  color: onAktiivinen ? kipuVari : '#111827',
                }}
              >
                {numero}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between mt-2.5 text-xs text-gray-500">
          <span>0 — ei kipua</span>
          <span>10 — sietämätön</span>
        </div>
      </div>

      {/* Liukusäätimen omat tyylit (Tailwindin ulottumattomissa) */}
      <style>{`
        .kipu-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 5px;
          outline: none;
        }
        .kipu-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: white;
          border: 2px solid #111827;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .kipu-slider::-moz-range-thumb {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: white;
          border: 2px solid #111827;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
