// Vaihe B Pala B3 — Linjausmittarit
//
// 9 vapaaehtoista mittaria jotka tallennetaan hoitokaynnit-tauluun
// erillisinä numeric-sarakkeina. NULL = ei mitattu.
//
// 2026-05-02: poistettu UI:sta 6 mittaria (akillesjänteen kulma vasen/oikea,
// niskan käännös vasen/oikea, skolioosin kierto, pään eteen työntyminen).
// DB-sarakkeet säilytetään legacy-datan vuoksi — siivotaan myöhemmin.
//
// normaali-määritys voi olla:
//   { arvo: 0 }              — yksi tarkka oletusarvo
//   { min: 4, max: 10 }      — väli
//   { max: 10 }              — alle X
//   kuvaus: lisäselite Tooltipia tai info-rivin tekstiä varten

export const MITTARIT = [
  {
    sarake:   'lantion_kallistus_aste',
    nimi:     'Lantion kallistuskulma',
    yksikko:  '°',
    min:      -10,
    max:       20,
    step:      0.5,
    normaali: { min: 4, max: 10, kuvaus: 'M 4–7°, N 7–10°' },
  },
  {
    sarake:   'lantion_sivuttainen_aste',
    nimi:     'Lantion sivuttainen kallistus',
    yksikko:  '°',
    min:      -10,
    max:       10,
    step:      0.5,
    normaali: { arvo: 0 },
  },
  {
    sarake:   'lantion_kierto_aste',
    nimi:     'Lantion kierto',
    yksikko:  '°',
    min:      -15,
    max:       15,
    step:      0.5,
    normaali: { arvo: 0 },
  },
  {
    sarake:   'olkapaiden_korkeusero_cm',
    nimi:     'Olkapäiden korkeusero',
    yksikko:  'cm',
    min:      -3,
    max:       3,
    step:      0.1,
    normaali: { arvo: 0 },
  },
  {
    sarake:   'q_kulma_vasen_aste',
    nimi:     'Q-kulma vasen',
    yksikko:  '°',
    min:      0,
    max:      30,
    step:     0.5,
    normaali: { min: 14, max: 17 },
  },
  {
    sarake:   'q_kulma_oikea_aste',
    nimi:     'Q-kulma oikea',
    yksikko:  '°',
    min:      0,
    max:      30,
    step:     0.5,
    normaali: { min: 14, max: 17 },
  },
  {
    sarake:   'jalkapituus_ero_cm',
    nimi:     'Jalkapituus-ero',
    yksikko:  'cm',
    min:      -2,
    max:       2,
    step:      0.1,
    normaali: { arvo: 0 },
  },
  {
    sarake:   'navicular_drop_vasen_mm',
    nimi:     'Navicular drop vasen',
    yksikko:  'mm',
    min:      0,
    max:      20,
    step:     1,
    normaali: { max: 10, kuvaus: 'alle 10 mm' },
  },
  {
    sarake:   'navicular_drop_oikea_mm',
    nimi:     'Navicular drop oikea',
    yksikko:  'mm',
    min:      0,
    max:      20,
    step:     1,
    normaali: { max: 10, kuvaus: 'alle 10 mm' },
  },
]

// Tarkista onko arvo normaalialueen sisällä. Käytetään keltaisen huutomerkin
// näyttämiseen (varoitus, ei estoa).
export function arvoNormaalialueella(mittari, arvo) {
  if (arvo === null || arvo === undefined) return true  // tyhjä → ei varoitusta
  const n = mittari.normaali
  if (!n) return true
  if (n.arvo !== undefined) {
    // Tarkka oletusarvo — sallitaan ±10 % min-max-välistä joustoa
    const valitan = mittari.max - mittari.min
    const tol = valitan * 0.1
    return Math.abs(arvo - n.arvo) <= tol
  }
  if (n.min !== undefined && arvo < n.min) return false
  if (n.max !== undefined && arvo > n.max) return false
  return true
}
