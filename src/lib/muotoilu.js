// Päivämäärän muotoilufunktiot — käytetään useassa komponentissa
// (Asiakasrekisteri, KayntiNakyma, Kayntihistoria, UudenAsiakkaanTarkistus,
// LomakeKirjasto). Aiemmin sama logiikka oli kopioitu jokaiseen tiedostoon
// erikseen.
//
// Suomenkielinen oletus: käytetään fi-FI-locale ja toleroidaan nullit
// palauttamalla null tai annettu fallback.

export function muotoilePvm(iso, fallback = null) {
  if (!iso) return fallback
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleDateString('fi-FI')
  } catch {
    return fallback
  }
}

export function muotoilePvmAika(iso, fallback = null) {
  if (!iso) return fallback
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleString('fi-FI')
  } catch {
    return fallback
  }
}
