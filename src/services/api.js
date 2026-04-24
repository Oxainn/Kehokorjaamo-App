function muotoileRyhmä(findings, tyyppi) {
  return findings
    .filter(f => f.tyyppi === tyyppi)
    .map(f => {
      const osat = [`  • ${f.alue} — kipu VAS ${f.kipu}/10`]
      if (f.kirjaukset) {
        Object.entries(f.kirjaukset)
          .filter(([, v]) => v !== null)
          .forEach(([k, v]) => osat.push(`    ${k}: ${v}`))
      }
      return osat.join('\n')
    })
    .join('\n')
}

function muotoileHavainnot(havainnot) {
  if (!havainnot) return ''
  const rivit = []
  Object.entries(havainnot.havainnot ?? {}).forEach(([alue, teksti]) => {
    if (teksti?.trim()) rivit.push(`  ${alue}: ${teksti.trim()}`)
  })
  const muutokset = []
  Object.entries(havainnot.muutokset ?? {}).forEach(([alue, tyypit]) => {
    const valitut = Object.entries(tyypit)
      .filter(([, v]) => v)
      .map(([t]) => t)
    if (valitut.length) muutokset.push(`  ${alue}: ${valitut.join(', ')}`)
  })
  if (!rivit.length && !muutokset.length) return ''
  let osio = 'Hoitajan rakenteelliset havainnot:\n'
  if (rivit.length)     osio += rivit.join('\n') + '\n'
  if (muutokset.length) osio += 'Muutostyypit:\n' + muutokset.join('\n') + '\n'
  return osio + '\n'
}

export function buildPrompt(findings, havainnot) {
  const primaari   = muotoileRyhmä(findings, 'primaari')
  const lantioSeur = muotoileRyhmä(findings, 'lantio-seuraus')
  const selkaSeur  = muotoileRyhmä(findings, 'selkaranka-seuraus')

  let teksti = 'Analysoi nämä kehon kartoituslöydökset jäsenkorjaajan näkökulmasta.\n\n'

  if (primaari) {
    teksti += 'PRIMAARISET LÖYDÖKSET (juurisyy):\n' + primaari + '\n\n'
  }
  if (lantioSeur) {
    teksti += 'LANTION AIHEUTTAMAT SEURAUKSET:\n' + lantioSeur + '\n\n'
  }
  if (selkaSeur) {
    teksti += 'SELKÄRANGAN SEURAUKSET:\n' + selkaSeur + '\n\n'
  }

  teksti += muotoileHavainnot(havainnot)

  teksti +=
    'Analyysiohjeet:\n' +
    '- Lantio ja SI-nivel ovat juurisyy — aloita aina niiden hoidosta\n' +
    '- Selitä mitkä seurauslöydökset johtuvat lantiosta\n' +
    '- Huomioi, että monet seuraukset korjaantuvat lantion korjauksen myötä\n' +
    '- Käytä selkokieltä ilman lääketieteellistä jargonia\n\n' +
    'Palauta vastauksesi AINOASTAAN JSON-muodossa, ei muuta tekstiä ennen tai jälkeen.\n' +
    'Käytä tätä rakennetta:\n' +
    '{\n' +
    '  "yhteenveto": string,\n' +
    '  "aiheuttajat": [string],\n' +
    '  "toimenpiteet": [\n' +
    '    {\n' +
    '      "jarjestys": number,\n' +
    '      "rakenne": string,\n' +
    '      "puoli": string,\n' +
    '      "tekniikka": string,\n' +
    '      "selitys": string\n' +
    '    }\n' +
    '  ],\n' +
    '  "jalkihoito": [\n' +
    '    {\n' +
    '      "tyyppi": string,\n' +
    '      "ohje": string,\n' +
    '      "toistot": string\n' +
    '    }\n' +
    '  ]\n' +
    '}'

  return teksti
}

function muunnaData(data) {
  return {
    yhteenveto:   data.yhteenveto   ?? '',
    aiheuttajat:  data.aiheuttajat  ?? [],
    toimenpiteet: data.toimenpiteet ?? [],
    jalkihoito:   data.jalkihoito   ?? [],
  }
}

export function parseResponse(text) {
  if (!text?.trim()) {
    return { yhteenveto: '', aiheuttajat: [], toimenpiteet: [], jalkihoito: [] }
  }

  // 1. Puhdas JSON tai JSON koodiblokissa
  try {
    const puhdas = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    return muunnaData(JSON.parse(puhdas))
  } catch { /* jatketaan */ }

  // 2. JSON tekstin seassa — etsi ensimmäinen { ja viimeinen }
  try {
    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return muunnaData(JSON.parse(text.substring(start, end + 1)))
    }
  } catch { /* jatketaan */ }

  // 3. Vapaamuotoinen teksti — koko vastaus yhteenvetona
  return { yhteenveto: text, aiheuttajat: [], toimenpiteet: [], jalkihoito: [] }
}
