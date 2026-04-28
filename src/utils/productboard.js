const VERSIO = 'V1'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const parsiiIdeatTekstistä = (teksti) => {
  const ideat = []
  let valmis = null

  if (!teksti || typeof teksti !== 'string') {
    return { ideat, valmis }
  }

  // Sallitut bullet-merkit: *, -, •, –, —, ‣, ▪, ►, ◦ tai numeroitu: 1. 2. 3) 4)
  const BULLET = /^[\s ]*([*\-•–—‣▪►◦]|\d+[.)])\s+/

  // Tapa 1: IDEAT_ALKAA...IDEAT_LOPPUU
  const blokkiMatch = teksti.match(/IDEAT_ALKAA([\s\S]*?)IDEAT_LOPPUU/)
  if (blokkiMatch) {
    blokkiMatch[1]
      .split(/\r?\n/)
      .map(r => r.replace(BULLET, '').trim())
      .filter(r => r.length > 3 && !/^IDEAT_/.test(r))
      .forEach(r => ideat.push(r))
  }

  // Tapa 2: bullet- tai numerolistat koko tekstistä
  if (ideat.length === 0) {
    teksti.split(/\r?\n/)
      .filter(r => BULLET.test(r))
      .map(r => r.replace(BULLET, '').trim())
      .filter(r => r.length > 3)
      .forEach(r => ideat.push(r))
  }

  // VALMIS: rivi (sallitaan myös pieni alkukirjain ja ympäröivät tähdet)
  const valmisMatch = teksti.match(/\*{0,2}VALMIS:?\*{0,2}\s*(.+)/i)
  if (valmisMatch) {
    valmis = valmisMatch[1].replace(/\*+$/, '').trim()
  }

  return { ideat, valmis }
}

export function rakennaPbPäivitys(teksti, tehtävät) {
  const { ideat, valmis } = parsiiIdeatTekstistä(teksti)
  const uudet = ideat.map(r => ({
    id: uid(), teksti: r,
    lisätty: new Date().toISOString(), tila: 'idea',
  }))
  const valmistuvat = valmis
    ? (tehtävät ?? []).filter(t => t.teksti.toLowerCase() === valmis.toLowerCase())
    : []
  const valmistuvienIdt = new Set(valmistuvat.map(t => t.id))
  const uudetCL = valmistuvat.map(t => ({
    id: uid(), teksti: t.teksti,
    valmistunut: new Date().toISOString(), versio: VERSIO,
  }))
  return { uudet, valmistuvat, valmistuvienIdt, uudetCL }
}
