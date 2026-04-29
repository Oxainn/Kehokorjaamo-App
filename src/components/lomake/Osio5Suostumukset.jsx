// Osio 5 — Suostumukset
// Sijainti repossa: src/components/lomake/Osio5Suostumukset.jsx
//
// Mitä tämä tekee:
// - GDPR-suostumus (checkbox, pakollinen uusille asiakkaille)
// - Valinnainen lupa tietojen luovuttamiseen hoitoon osallistuville
// - Allekirjoituskenttä (käyttää valmista AllekirjoitusPad-komponenttia)
// - Päiväys + nimi näkyvät automaattisesti
//
// Pakollisuusvalidointi tehdään myöhemmin lomakkeen lähetysvaiheessa.
//
// Controlled component: vanhempi-komponentti hallitsee tilaa.

import AllekirjoitusPad from '../AllekirjoitusPad';

export default function Osio5Suostumukset({
  arvo = {
    gdprHyvaksytty: false,
    lupaLuovutukseen: false,
    allekirjoitus: '',
  },
  onMuutos = () => {},
  asiakkaanNimi = '',
}) {
  // Null-suoja
  const gdprHyvaksytty = arvo?.gdprHyvaksytty ?? false;
  const lupaLuovutukseen = arvo?.lupaLuovutukseen ?? false;
  const allekirjoitus = arvo?.allekirjoitus ?? '';

  // Päiväys käyttöliittymään (suomen muodossa)
  const tanaan = new Date().toLocaleDateString('fi-FI');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">

      {/* Otsikko */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          Suostumukset ja allekirjoitus
        </h2>
        <p className="text-sm text-gray-500">
          Tarkista ja hyväksy tietojen käsittely
        </p>
      </div>

      {/* GDPR-suostumus */}
      <div className="mb-4">
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={gdprHyvaksytty}
            onChange={(t) => onMuutos({ ...arvo, gdprHyvaksytty: t.target.checked })}
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

      {/* Lupa tietojen luovutukseen — valinnainen */}
      <div className="mb-5">
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={lupaLuovutukseen}
            onChange={(t) => onMuutos({ ...arvo, lupaLuovutukseen: t.target.checked })}
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

      {/* Allekirjoitus */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Allekirjoitus
          <span className="text-red-600 ml-1">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Piirrä allekirjoitus sormella tai hiirellä
        </p>
        <AllekirjoitusPad
          onChange={(dataURL) => onMuutos({ ...arvo, allekirjoitus: dataURL })}
          error={false}
        />
      </div>

      {/* Päiväys ja nimi */}
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
    </div>
  );
}
