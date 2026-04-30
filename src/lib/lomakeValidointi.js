// Pakollisuusvalidointi lomakerenderöijälle.
// Palauttaa { [kentta_id_tunniste]: virheviesti } -objektin niistä kentistä joissa on virhe.

const onTyhja = (arvo, kenttatyyppi) => {
  if (arvo === null || arvo === undefined) return true
  if (kenttatyyppi === 'checkbox') return arvo !== true
  if (typeof arvo === 'string') return arvo.trim() === ''
  return false
}

const oletusVirheviesti = (kentta) => {
  const fi = kentta?.kaannokset?.fi
  if (fi?.virheilmoitus) return fi.virheilmoitus
  const otsikko = fi?.otsikko ?? kentta?.tunniste ?? 'Kenttä'
  return `${otsikko} on pakollinen`
}

export const validoiVastaukset = (rakenne, kentat, vastaukset) => {
  const virheet = {}
  if (!rakenne) return virheet

  for (const osio of rakenne.osiot ?? []) {
    for (const kf of osio.kenttat ?? []) {
      const tunniste = kf.kentta_id_tunniste
      const kentta   = kentat[tunniste]
      if (!kentta) continue

      const pakollinen = kf.pakollinen || kentta.validointi?.pakollinen
      if (!pakollinen) continue

      if (onTyhja(vastaukset?.[tunniste], kentta.tyyppi)) {
        virheet[tunniste] = oletusVirheviesti(kentta)
      }
    }
  }

  return virheet
}
