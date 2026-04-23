function muotoileLöydökset(findings) {
  return findings
    .map((f, i) => {
      const osat = [`${i + 1}. ${f.alue} — kipu VAS ${f.kipu}/10`]
      if (f.kallistus) osat.push(`kallistus: ${f.kallistus}`)
      if (f.kierto)    osat.push(`kierto: ${f.kierto}`)
      return osat.join(', ')
    })
    .join('\n')
}

export function buildPrompt(findings) {
  return (
    'Analysoi nämä kehon kartoituslöydökset jäsenkorjaajan näkökulmasta:\n\n' +
    muotoileLöydökset(findings) +
    '\n\nEtsi aiheuttajat, ehdota toimenpiteet tärkeysjärjestyksessä, ' +
    'käytä selkokieltä ilman lääketieteellistä jargonia.\n\n' +
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
  )
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
