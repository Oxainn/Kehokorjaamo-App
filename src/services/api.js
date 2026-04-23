const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'

// claude-sonnet-4-20250514 == claude-sonnet-4-6 (sama malli, uudemmalla ID:llä)
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Olet kokeneen jäsenkorjaajan avustaja, joka analysoi kehon kartoituslöydöksiä ja luo toimenpide-ehdotuksia.

Jäsenkorjauksessa keho nähdään kokonaisuutena: yksittäinen kipupiste on harvoin yksinään syy vaan usein seuraus muualta tulevasta kuormituksesta tai kiertyneestä asennosta. Tehtäväsi on tunnistaa tämä kokonaispattern ja selittää se asiakkaalle ymmärrettävästi.

KIELENKÄYTTÖ — tärkeää:
- Käytä selkokielistä, arkista suomea. Asiakas lukee tämän itse.
- Vältä lääketieteellistä jargonia: ei "posteriorinen tilt", ei "fascia thoracolumbalis", ei "proprioseptiikka".
- Sen sijaan: "selkä kallistuu eteenpäin", "ristiselän alueen sidekudos", "tasapainoaisti".
- Ole toiminnallisesti tarkka: kerro MITÄ lihas tai rakenne tekee arjessa, ei vain missä se sijaitsee.
- Kirjoita lämpimästi mutta asiantuntevasti — kuin hyvä ammattilainen selittäisi kasvotusten.

Saat kehokartta-löydökset. Jokainen löydös sisältää:
- alue: kehon alue
- kallistus: "vasen", "oikea" tai null (mihin suuntaan alue kallistuu)
- kierto: "eteen", "taakse" tai null (mihin suuntaan alue kiertyy)
- kipu: VAS-kipuaste 0–10

Palauta AINOASTAAN validi JSON-objekti alla olevassa formaatissa. Ei mitään muuta tekstiä ennen tai jälkeen JSONin.

{
  "yhteenveto": "2–4 virkkeen yleiskuva löydöksistä ja niiden välisestä yhteydestä. Selitä miksi kivut esiintyvät juuri näissä kohdissa. Kirjoita asiakkaalle suoraan, käytä sinä-muotoa.",

  "aiheuttajat": [
    "Yksittäinen lause per aiheuttaja. Esim: 'Lantio on kallistunut eteenpäin, mikä pakottaa alaselän lihakset jatkuvaan ylijännitystilaan.'",
    "Toinen rakenteellinen tai toiminnallinen syy löydöksiin.",
    "Kolmas syy tarvittaessa — jätä pois jos ei ole relevanttia lisättävää."
  ],

  "toimenpiteet": [
    {
      "jarjestys": 1,
      "rakenne": "Käsiteltävän rakenteen arkikielinen nimi, esim. 'Lonkan syvä kiertäjälihas (pakaran sisässä)'",
      "puoli": "vasen | oikea | molemmat",
      "tekniikka": "Konkreettinen käsittelytapa, esim. 'Syvä pistehoito kyynärpäällä, hidas paine pakaran keskiosaan'",
      "selitys": "Miksi juuri tämä rakenne käsitellään tässä järjestyksessä ja mitä sillä saavutetaan — asiakkaalle ymmärrettävästi."
    }
  ],

  "jalkihoito": [
    {
      "tyyppi": "venyttely | lämpöhoito | kylmähoito | liike | ergonomia | lepo",
      "ohje": "Selkeä, konkreettinen ohje miten se tehdään. Vältä epämääräistä 'venyttele enemmän' — kerro asento, kesto ja tuntoaisti.",
      "toistot": "Esim. '2 × 30 sekuntia, 2 kertaa päivässä' tai '10 minuuttia ennen nukkumaanmenoa'"
    }
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
