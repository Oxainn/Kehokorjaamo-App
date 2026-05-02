// Ympäristön tunnistus — Live vs Kehitys vs Local.
//
// Tunnistus 2 tasoa:
// 1. import.meta.env.VITE_ENVIRONMENT — jos asetettu Vercelin env-vareihin
//    arvoiksi 'live' tai 'kehitys', käytetään sitä (eksplisiittinen)
// 2. window.location.hostname — fallback joka toimii ilman env-asetuksia
//
// Käytössä:
// - YmparistoChip topbarissa
// - D2 Versionhallinta-sivun otsikko
// - D3 "Siirrä Liveen" -nappi näytetään vain Kehityksessä

export const YMPARISTO = {
  LIVE:    'live',
  KEHITYS: 'kehitys',
  LOCAL:   'local',
}

export function tunnistaYmparisto() {
  // Eksplisiittinen Vercel/Vite env-muuttuja voittaa
  const env = import.meta.env.VITE_ENVIRONMENT
  if (env === 'live' || env === 'kehitys' || env === 'local') {
    return env
  }

  // Heuristiikka host-nimestä
  if (typeof window === 'undefined') return YMPARISTO.LIVE
  const host = window.location.hostname.toLowerCase()

  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    return YMPARISTO.LOCAL
  }
  if (host.includes('kehitys')) {
    return YMPARISTO.KEHITYS
  }
  // Tuotanto-host (kehokorjaamo-app.vercel.app, kalevalapaja.fi tms.)
  // tai tuntematon → kohdellaan Livenä turvallisuussyistä
  return YMPARISTO.LIVE
}

export function ymparistoTeksti(y) {
  if (y === YMPARISTO.LIVE)    return 'LIVE'
  if (y === YMPARISTO.KEHITYS) return 'KEHITYS'
  if (y === YMPARISTO.LOCAL)   return 'LOCAL'
  return '—'
}

export function ymparistoVarit(y) {
  if (y === YMPARISTO.LIVE) {
    return { background: '#15803d', color: 'white', border: '1px solid #166534' }
  }
  if (y === YMPARISTO.KEHITYS) {
    return { background: '#f59e0b', color: '#7c2d12', border: '1px solid #d97706' }
  }
  if (y === YMPARISTO.LOCAL) {
    return { background: '#3b82f6', color: 'white', border: '1px solid #2563eb' }
  }
  return { background: '#9ca3af', color: 'white', border: '1px solid #6b7280' }
}

// Vastapari-ympäristö navigointia varten:
// LIVE → KEHITYS, KEHITYS → LIVE. LOCAL → KEHITYS oletuksena.
// Palauttaa { teksti, url } tai null jos vastaparia ei ole.
export function vastapariYmparisto(y) {
  if (y === YMPARISTO.LIVE) {
    return { teksti: 'KEHITYS', url: 'https://kehokorjaamo-kehitys.vercel.app' }
  }
  if (y === YMPARISTO.KEHITYS) {
    return { teksti: 'LIVE', url: 'https://kehokorjaamo-app.vercel.app' }
  }
  if (y === YMPARISTO.LOCAL) {
    return { teksti: 'KEHITYS', url: 'https://kehokorjaamo-kehitys.vercel.app' }
  }
  return null
}
