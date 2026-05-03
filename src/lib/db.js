// Kehokorjaamo-App — tietokantakerros (Supabase JS-client)
//
// Lomake-terminologia:
//   A-lomake = asiakastietolomake_versiot (asiakkaan täyttämä esitietolomake)
//             Yksi voimassa oleva versio per asiakas (voimassa_asti IS NULL),
//             historia voimassa_asti-aikaleimalla.
//   B-lomake = hoitokaynnit (hoitajan täyttämä havaintolomake)
//             Yksi rivi per käynti. Tilat: 'odottaa_kayntia' (tyhjä, asiakas
//             vahvistettu mutta käynti ei vielä pidetty), 'luonnos' (käynnissä,
//             "+ Uusi käynti" avasi sen), 'valmis' (hoitokirjaus tallennettu).
//
// "+ Uusi käynti" -toiminto: sulkee A-lomakkeen aktiivisen version, kopioi
// sen sisällön uuteen avoimeen versioon (jatkohoitoa varten), ja päivittää
// asiakkaan tyhjää B-lomaketta luonnos-tilaan. Jos tyhjää B-lomaketta ei
// ole (toinen tai myöhempi käynti), uusi B-lomake luodaan.

// Asiakas-pohjaiset funktiot omassa moduulissa — re-exportoidaan tästä
// barrel-vientipisteestä jotta komponenttien import-polut säilyvät.
export * from './db/asiakkaat'
export * from './db/kaynnit'
export * from './db/lomake'
export * from './db/itsehoito'
export * from './db/ai'
export * from './db/palvelut'
export * from './db/asentokuvat'
