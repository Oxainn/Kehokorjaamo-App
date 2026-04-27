const VERSIO = 'V1'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const parsiiIdeatTekstistä = (teksti) => {
  const ideat = []
  let valmis = null

  // Tapa 1: IDEAT_ALKAA...IDEAT_LOPPUU
  const blokkiMatch = teksti.match(/IDEAT_ALKAA([\s\S]*?)IDEAT_LOPPUU/)
  if (blokkiMatch) {
    blokkiMatch[1]
      .split('\n')
      .map(r => r.replace(/^[\s*\-•]+/, '').trim())
      .filter(r => r.length > 3)
      .forEach(r => ideat.push(r))
  }

  // Tapa 2: * tai - bullet listat
  if (ideat.length === 0) {
    teksti.split('\n')
      .filter(r => /^[\*\-•]\s/.test(r.trim()))
      .map(r => r.replace(/^[\s*\-•]+/, '').trim())
      .filter(r => r.length > 3)
      .forEach(r => ideat.push(r))
  }

  // VALMIS: rivi
  const valmisMatch = teksti.match(/VALMIS:\s*(.+)/)
  if (valmisMatch) {
    valmis = valmisMatch[1].trim()
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
