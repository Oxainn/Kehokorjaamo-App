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
    'käytä selkokieltä ilman lääketieteellistä jargonia.'
  )
}

export function parseResponse(text) {
  if (!text?.trim()) {
    return { yhteenveto: '', aiheuttajat: [], toimenpiteet: [], jalkihoito: [] }
  }

  try {
    const puhdas = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const data = JSON.parse(puhdas)
    return {
      yhteenveto:   data.yhteenveto   ?? '',
      aiheuttajat:  data.aiheuttajat  ?? [],
      toimenpiteet: data.toimenpiteet ?? [],
      jalkihoito:   data.jalkihoito   ?? [],
    }
  } catch {
    return { yhteenveto: text, aiheuttajat: [], toimenpiteet: [], jalkihoito: [] }
  }
}
