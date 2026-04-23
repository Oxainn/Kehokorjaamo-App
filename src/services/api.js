const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'

// claude-sonnet-4-20250514 == claude-sonnet-4-6 (sama malli, uudemmalla ID:llä)
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Olet kokenut lihashuollon terapeutti, joka tekee asiantuntevia kehon kartoitusanalyysejä.

Saat asiakkaalta kehokartta-löydökset JSON-muodossa. Jokainen löydös sisältää:
- alue: kehon alue (esim. "Lantio / alaselkä")
- kallistus: "vasen", "oikea" tai null
- kierto: "eteen", "taakse" tai null
- kipu: kipuaste VAS-asteikolla 0–10

Tehtäväsi on:
1. Tunnistaa löydösten välinen yhteys ja kokonaispattern
2. Priorisoida hoidettavat alueet kipuasteen ja toiminnallisen merkityksen mukaan
3. Luoda konkreettinen, yksilöllinen hoitosuunnitelma

Palauta AINOASTAAN validi JSON-objekti alla olevassa formaatissa — ei mitään muuta tekstiä ennen tai jälkeen JSONin.

Vastausformaatti:
{
  "yhteenveto": "2–4 virkkeen yleiskuvaus löydöksistä ja niiden keskinäisistä yhteyksistä. Kirjoita asiakkaalle ymmärrettävästi.",
  "kiireellisyys": "matala | kohtalainen | korkea",
  "paapatteri": "Mikä on löydösten pääteema? Esim. etukumartumapatteri, lantion kiertyminen, yksipuolinen ylikuormitus tms.",
  "prioriteetit": [
    {
      "jarjestys": 1,
      "alue": "alueen nimi",
      "perustelu": "Miksi tämä alue on tärkeä hoitaa ensin — selitä yhteys kipuun ja muihin löydöksiin."
    }
  ],
  "hoito_ohjelma": [
    {
      "alue": "alueen nimi",
      "kasittely": "Miten terapeutti käsittelee tämän alueen — konkreettiset tekniikat ja otteet.",
      "harjoitteet": [
        {
          "nimi": "Harjoitteen nimi",
          "ohje": "Selkeä suoritusohje askel askeleelta.",
          "toistot": "Esim. 3 × 10 toistoa tai 30 sekuntia 3 kertaa"
        }
      ],
      "kotiohjeet": "Mitä asiakas voi tehdä itse kotona — venyttelyt, lämpö/kylmä, arkiergonomia.",
      "tavoite": "Mitä tällä alueella pyritään saavuttamaan hoidolla."
    }
  ],
  "yleissuositukset": "Yleiset elämäntapa- ja ergonomiasuositukset löydösten perusteella.",
  "jatkosuositukset": "Milloin seuraava hoitokäynti, mihin kiinnittää huomiota välillä.",
  "varoitukset": [
    "Listaa tähän jos jokin löydös vaatii lääkärissä käyntiä tai erityisvarovaisuutta. Jätä tyhjäksi listaksi [] jos ei ole huolenaiheita."
  ]
}`

function muotoileLöydökset(findings) {
  return findings
    .map((f, i) => {
      const osat = [`${i + 1}. Alue: ${f.alue}`, `   Kipu (VAS): ${f.kipu}/10`]
      if (f.kallistus) osat.push(`   Kallistus: ${f.kallistus}`)
      if (f.kierto)    osat.push(`   Kierto: ${f.kierto}`)
      return osat.join('\n')
    })
    .join('\n\n')
}

function suomenkielinenVirhe(status, body) {
  if (status === 401) return 'API-avain on virheellinen tai puuttuu. Tarkista VITE_CLAUDE_API_KEY.'
  if (status === 403) return 'API-avaimella ei ole oikeuksia tähän toimintoon.'
  if (status === 429) return 'Liian monta pyyntöä. Odota hetki ja yritä uudelleen.'
  if (status === 500) return 'Anthropicin palvelimella on tilapäinen ongelma. Yritä uudelleen.'
  if (status === 529) return 'Palvelu on ylikuormittunut. Yritä hetken kuluttua uudelleen.'
  const viesti = body?.error?.message
  return viesti ? `API-virhe: ${viesti}` : `Tuntematon virhe (HTTP ${status}).`
}

/**
 * Lähettää kehokarttälöydökset Claude-mallille analysoitavaksi.
 * @param {Array<{alue: string, kallistus: string|null, kierto: string|null, kipu: number}>} findings
 * @returns {Promise<object>} Strukturoitu hoitosuunnitelma tai { virhe: string }
 */
export async function analyzeFindings(findings) {
  if (!API_KEY) {
    return { virhe: 'API-avain puuttuu. Aseta VITE_CLAUDE_API_KEY .env-tiedostoon.' }
  }
  if (!findings?.length) {
    return { virhe: 'Ei löydöksiä analysoitavaksi. Lisää ensin löydöksiä kehokartalle.' }
  }

  const userMessage =
    `Analysoi seuraavat kehokarttälöydökset ja luo hoitosuunnitelma:\n\n` +
    muotoileLöydökset(findings) +
    `\n\nPalauta hoitosuunnitelma pyytämässäni JSON-formaatissa.`

  let response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        // Tarvitaan suorien selainpyyntöjen sallimiseen.
        // Tuotannossa käytä backendia API-avaimen suojaamiseksi.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch {
    return { virhe: 'Verkkovirhe: ei yhteyttä Anthropicin palvelimeen. Tarkista internet-yhteys.' }
  }

  if (!response.ok) {
    let body = null
    try { body = await response.json() } catch { /* ignore */ }
    return { virhe: suomenkielinenVirhe(response.status, body) }
  }

  let data
  try {
    data = await response.json()
  } catch {
    return { virhe: 'Vastauksen lukeminen epäonnistui. Yritä uudelleen.' }
  }

  const teksti = data?.content?.[0]?.text
  if (!teksti) {
    return { virhe: 'Malli palautti tyhjän vastauksen. Yritä uudelleen.' }
  }

  try {
    // Poista mahdolliset markdown-koodiblokki-merkit ennen JSON-parsintaa
    const puhdas = teksti.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(puhdas)
  } catch {
    return { virhe: 'Vastauksen jäsentäminen epäonnistui. Malli palautti virheellisen JSON:n.' }
  }
}
