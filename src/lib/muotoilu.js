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

// Muodostaa CSV-merkkijonon riveistä. Lainausmerkit kentissä joissa pilkku,
// rivinvaihto tai kaksoisheittomerkki — kaksoisheittomerkit kahdennetaan
// RFC 4180 -mukaisesti. UTF-8 BOM lisätään alkuun jotta Excel tunnistaa
// merkistön oikein.
export function muodostaCSV(otsikot, rivit) {
  const escape = (arvo) => {
    if (arvo === null || arvo === undefined) return ''
    const s = String(arvo)
    if (/[",\n\r;]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    otsikot.map(escape).join(','),
    ...rivit.map((r) => r.map(escape).join(',')),
  ]
  // ﻿ = UTF-8 BOM (auttaa Exceliä tunnistamaan UTF-8:n)
  return '﻿' + lines.join('\r\n')
}

// Triggeröi tiedoston latauksen selaimessa annetun sisällön ja nimen kanssa.
export function lataaTiedosto(sisalto, tiedostonimi, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([sisalto], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = tiedostonimi
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
