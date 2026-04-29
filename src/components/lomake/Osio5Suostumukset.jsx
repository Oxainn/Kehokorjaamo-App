// Osio 5 — Suostumukset
// Sijainti repossa: src/components/lomake/Osio5Suostumukset.jsx
//
// Mitä tämä tekee:
// - UUSI asiakas: GDPR-suostumus + allekirjoitus pakollisia
// - OLEMASSA OLEVA: näyttää tiedoksi "Suostumukset annettu [pvm]"
//                   - voi halutessaan antaa uudet jos muuttunut
// - Valinnainen: lupa tietojen luovuttamiseen
// - Tallenna-nappi alaosassa (toistaiseksi vain ilmoittaa, varsinainen
//   tallennus tehdään seuraavalla istunnolla)

import { useState } from 'react';
import AllekirjoitusPad from '../AllekirjoitusPad';

export default function Osio5Suostumukset({
  arvo = {
    gdprHyvaksytty: false,
    lupaLuovutukseen: false,
    allekirjoitus: '',
  },
  onMuutos = () => {},
  asiakkaanNimi = '',
  onUusiAsiakas = true,
  aiempiSuostumusPvm = null,
  onTallenna = null, // callback tallennukselle (tulossa myöhemmin)
}) {
  // Null-suoja
  const gdprHyvaksytty = arvo?.gdprHyvaksytty ?? false;
  const lupaLuovutukseen = arvo?.lupaLuovutukseen ?? false;
  const allekirjoitus = arvo?.allekirjoitus ?? '';

  const [paivitetaan, setPaivitetaan] = useState(false);
  const [tallennusIlmoitus, setTallennusIlmoitus] = useState(null);

  const tanaan = new Date().toLocaleDateString('fi-FI');
  const naytaTaysi = onUusiAsiakas || paivitetaan;

  // Päivitä yksi kenttä rikkomatta muita.
  // KORJAUS: AllekirjoitusPad kutsuu onChange(''):lla alustuessaan, mikä
  // ei saa nollata GDPR-ruksia tai luovutuslupaa.
  function paivitaKentta(kentta, uusiArvo) {
    onMuutos({
      ...arvo,
      [kentta]: uusiArvo,
    });
  }

  // Klikkaus tallenna-nappiin (toistaiseksi vain ilmoitus)
  function kasitteleTallennus() {
    if (onTallenna) {
      onTallenna(arvo);
      return;
    }
    // Toistaiseksi: kerrotaan että tulossa
    console.log('Lomakedata valmiina tallennukseen:', {
      suostumukset: arvo,
      asiakkaanNimi,
      onUusiAsiakas,
      paivamaara: tanaan,
    });
    setTallennusIlmoitus('Tallennuslogiikka tulossa seuraavassa vaiheessa. Data on konsolissa nähtävillä.');
    setTimeout(() => setTallennusIlmoitus(null), 5000);
  }

  // Voiko tallentaa? (kevyt validointi)
  const voiTallentaa = naytaTaysi
    ? (gdprHyvaksytty && allekirjoitus.length > 0)
    : true; // olemassa oleva asiakas voi aina jatkaa

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">

      <div className="mb-5">
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          Suostumukset ja allekirjoitus
        </h2>
        <p className="text-sm text-gray-500">
          {naytaTaysi
            ? 'Tarkista ja hyväksy tietojen käsittely'
            : 'Suostumuksesi on jo annettu'}
        </p>
      </div>

      {!naytaTaysi && (
        <div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-green-600 text-xl flex-shrink-0">✓</div>
              <div className="text-sm">
                <div className="font-medium text-green-900 mb-1">
                  Suostumukset annettu
                </div>
                <div className="text-green-800">
                  {aiempiSuostumusPvm
                    ? `Hyväksyit tietojesi käsittelyn ${aiempiSuostumusPvm}. Sinun ei tarvitse antaa allekirjoitusta uudestaan.`
                    : 'Hyväksyit tietojesi käsittelyn aiemmin. Sinun ei tarvitse antaa allekirjoitusta uudestaan.'}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPaivitetaan(true)}
            className="text-sm text-blue-600 underline"
          >
            Haluan päivittää suostumukseni
          </button>
        </div>
      )}

      {naytaTaysi && (
        <>
          <div className="mb-4">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={gdprHyvaksytty}
                onChange={(t) => paivitaKentta('gdprHyvaksytty', t.target.checked)}
                className="mt-0.5 w-5 h-5 cursor-pointer flex-shrink-0"
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  Hyväksyn tietojeni käsittelyn
                  <span className="text-red-600 ml-1">*</span>
                </div>
                <div className="text-gray-600">
                  Antamiani tietoja käytetään hoitosuhteen toteuttamiseen.
                  Tiedot tallennetaan luottamuksellisesti tietosuojaselosteen mukaisesti.
                </div>
              </div>
            </label>
          </div>

          <div className="mb-5">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={lupaLuovutukseen}
                onChange={(t) => paivitaKentta('lupaLuovutukseen', t.target.checked)}
                className="mt-0.5 w-5 h-5 cursor-pointer flex-shrink-0"
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  Annan luvan tietojen luovuttamiseen hoitoon osallistuville
                </div>
                <div className="text-gray-600">
                  Esimerkiksi konsultaatio toisen hoitajan kanssa tai yhteistyö lääkärin kanssa.
                  Voit jättää tämän tyhjäksi.
                </div>
              </div>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Allekirjoitus
              <span className="text-red-600 ml-1">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Piirrä allekirjoitus sormella tai hiirellä
            </p>
            <AllekirjoitusPad
              onChange={(dataURL) => paivitaKentta('allekirjoitus', dataURL)}
              error={false}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm text-gray-600">
            <div>
              <span className="text-gray-500">Päiväys:</span>{' '}
              <span className="font-medium text-gray-900">{tanaan}</span>
            </div>
            {asiakkaanNimi && (
              <div>
                <span className="text-gray-500">Asiakas:</span>{' '}
                <span className="font-medium text-gray-900">{asiakkaanNimi}</span>
              </div>
            )}
          </div>

          {!onUusiAsiakas && paivitetaan && (
            <button
              type="button"
              onClick={() => setPaivitetaan(false)}
              className="mt-3 text-sm text-gray-500 underline"
            >
              Peruuta päivitys (käytä aiempaa suostumusta)
            </button>
          )}
        </>
      )}

      {/* Tallenna-nappi */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={kasitteleTallennus}
          disabled={!voiTallentaa}
          className="w-full px-4 py-3 text-base font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: voiTallentaa ? '#10b981' : '#d1d5db',
            color: 'white',
          }}
        >
          {onUusiAsiakas ? 'Tallenna asiakas' : 'Tallenna muutokset'}
        </button>

        {!voiTallentaa && naytaTaysi && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Hyväksy tietojen käsittely ja anna allekirjoitus jatkaaksesi
          </p>
        )}

        {tallennusIlmoitus && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 8,
              fontSize: 13,
              color: '#92400e',
              textAlign: 'center',
            }}
          >
            ℹ {tallennusIlmoitus}
          </div>
        )}
      </div>
    </div>
  );
}
