const VERSIO = 'V1'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function parsiiIdeatTekstistä(teksti, tehtävät) {
  const alku  = teksti.indexOf('IDEAT_ALKAA')
  const loppu = teksti.indexOf('IDEAT_LOPPUU')
  let rivit = []
  if (alku !== -1 && loppu !== -1 && loppu > alku) {
    rivit = teksti
      .slice(alku + 'IDEAT_ALKAA'.length, loppu)
      .split('\n').map(r => r.trim())
      .filter(r => r.startsWith('- ')).map(r => r.slice(2).trim())
      .filter(Boolean)
  } else {
    rivit = teksti
      .split('\n').map(r => r.trim())
      .filter(r => r.startsWith('- ')).map(r => r.slice(2).trim())
      .filter(Boolean)
  }

  const valmisTekstit = teksti
    .split('\n').map(r => r.trim())
    .filter(r => r.startsWith('VALMIS:')).map(r => r.slice('VALMIS:'.length).trim())
    .filter(Boolean)

  const uudet = rivit.map(r => ({
    id: uid(), teksti: r,
    lisätty: new Date().toISOString(), tila: 'idea',
  }))

  const valmistuvat = (tehtävät ?? []).filter(t =>
    valmisTekstit.some(v => v.toLowerCase() === t.teksti.toLowerCase())
  )
  const valmistuvienIdt = new Set(valmistuvat.map(t => t.id))
  const uudetCL = valmistuvat.map(t => ({
    id: uid(), teksti: t.teksti,
    valmistunut: new Date().toISOString(), versio: VERSIO,
  }))

  return { uudet, valmistuvat, valmistuvienIdt, uudetCL }
}
