// Lomakerenderöijän validointi.
// Palauttaa { [kentta_id_tunniste]: virheviesti } -objektin niistä kentistä joissa on virhe.
//
// Validointi on kahdessa kerroksessa:
//   1. Pakollisuus — jos kenttä on pakollinen ja arvo tyhjä
//   2. Sisältö — jos arvo on annettu, tarkistetaan että muoto on oikea
//      (esim. sähköposti vaatii @ ja domainin)

const onTyhja = (arvo, kenttatyyppi) => {
  if (arvo === null || arvo === undefined) return true
  if (kenttatyyppi === 'checkbox') return arvo !== true
  if (typeof arvo === 'string') return arvo.trim() === ''
  if (Array.isArray(arvo)) return arvo.length === 0
  return false
}

// Sähköpostin tarkistus: yksi @ joka erottaa local- ja domain-osat,
// vähintään yksi piste domain-osassa, ei välilyöntejä. Tarkoituksella
// löysä — tarkka RFC 5322 -toteutus on yli-insinöröintiä, mutta tämä
// estää tyypillisimmät virheet (puuttuva @, "x", "test", "a@b" ilman
// pistettä).
const onValidiSahkoposti = (arvo) => {
  if (typeof arvo !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(arvo.trim())
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

      // Infoteksti on staattinen sisältö — ei syötettä, ei pakollisuutta.
      // Kuvantaminen (AB-T7) ei tallenna omaa arvoa vastauksiin (data elää
      // asentokuvat/ai_loydos_analyysit -tauluissa) — pakollisuus ei semanttisesti sovi.
      if (kentta.tyyppi === 'infoteksti') continue
      if (kentta.tyyppi === 'kuvantaminen') continue

      const arvo       = vastaukset?.[tunniste]
      const pakollinen = kf.pakollinen || kentta.validointi?.pakollinen
      const tyhja      = onTyhja(arvo, kentta.tyyppi)

      // 1. Pakollisuus
      if (pakollinen && tyhja) {
        virheet[tunniste] = oletusVirheviesti(kentta)
        continue
      }

      // 2. Sisällön muoto — vain jos arvo on annettu (tyhjä valinnainen on OK)
      if (!tyhja) {
        if (kentta.tyyppi === 'sahkoposti' && !onValidiSahkoposti(arvo)) {
          virheet[tunniste] = 'Anna sähköpostiosoite muodossa nimi@esimerkki.fi'
          continue
        }
      }
    }
  }

  return virheet
}
