// Osio 5 — Suostumukset
// Sijainti repossa: src/components/lomake/Osio5Suostumukset.jsx
//
// Mitä tämä tekee:
// - UUSI asiakas: GDPR-suostumus + allekirjoitus pakollisia
// - OLEMASSA OLEVA: näyttää tiedoksi "Suostumukset annettu [pvm]"
// - Valinnainen: lupa tietojen luovuttamiseen
// - Kaksi nappia alaosassa:
//     * "Tulosta PDF" — luo PDF lomakkeesta (tulossa)
//     * "Allekirjoitus ja lähetä" — tallentaa + ohjaa eteenpäin (tulossa)

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
  onTulostaPdf = null,
  onAllekirjoitusJaLaheta = null,
}) {
  // Null-suoja
  const gdprHyvaksytty = arvo?.gdprHyvaksytty ?? false;
  const lupaLuovutukseen = arvo?.lupaLuovutukseen ?? false;
  const allekirjoitus = arvo?.allekirjoitus ?? '';

  const [paivitetaan, setPaivitetaan] = useState(false);
  const [ilmoitus, setIlmoitus] = useState(null);

  const tanaan = new Date().toLocaleDateString('fi-FI');
  const naytaTaysi = onUusiAsiakas || paivitetaan;

  // Päivitä yksi kenttä rikkomatta muita
  function paivitaKentta(kentta, uusiArvo) {
    onMuutos({
      ...arvo,
      [kentta]: uusiArvo,
    });
  }

  function naytaIlmoitus(teksti) {
    setIlmoitus(teksti);
    setTimeout(() => setIlmoitus(null), 5000);
  }

  function kasittelePdf() {
    if (onTulostaPdf) {
      onTulostaPdf(arvo);
      return;
    }
    naytaIlmoitus('PDF-tulostus tulossa myöhemmin.');
  }

  function kasitteleLahetys() {
    if (onAllekirjoitusJaLaheta) {
      onAllekirjoitusJaLaheta(arvo);
      return;
    }
    naytaIlmoitus('Lähetys ja tallennuslogiikka tulossa myöhemmin.');
  }

  // Voiko lähettää?
  const voiLahettaa = naytaTaysi
    ? (gdprHyvaksytty && allekirjoitus.length > 0)
    : true;

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

      {/* Kaksi nappia alaosassa */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={kasittelePdf}
            className="px-4 py-3 text-base font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Tulosta PDF
          </button>

          <button
            type="button"
            onClick={kasitteleLahetys}
            disabled={!voiLahettaa}
            className="px-4 py-3 text-base font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: voiLahettaa ? '#10b981' : '#d1d5db',
              color: 'white',
            }}
          >
            Allekirjoitus ja lähetä
          </button>
        </div>

        {!voiLahettaa && naytaTaysi && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Hyväksy tietojen käsittely ja anna allekirjoitus jatkaaksesi
          </p>
        )}

        {ilmoitus && (
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
            ℹ {ilmoitus}
          </div>
        )}
      </div>
    </div>
  );
}
