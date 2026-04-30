# Kehokorjaamo App — Roadmap

> **Tarkoitus:** Tämä tiedosto kertoo missä mennään ja minne ollaan menossa.
> Päivitä aina kun vaihe valmistuu tai suunnitelma muuttuu.
> Kun aloitat uuden Claude-chatin, voit sanoa: *"Lue ROADMAP.md ja jatka vaiheesta X"*.

**Viimeisin päivitys:** 2026-04-30

---

## Tuotenäkemys

Kehokorjaamo-App on **täysi alustatuote** joka korvaa kaiken hoitohuoneen pyörittämiseen tarvittavan: kotisivun, ajanvarauksen, asiakasrekisterin, hoitokirjaukset, maksut. Pitkän aikavälin tavoite on tehdä tästä **laajemmalle hoitaja-/terapeuttikunnalle myytävissä oleva tuote**.

**Asiakastietolomake on tuotteen ydin.** Kaikki muut osat (rekisteri, ajanvaraus, portaali, maksut) rakentuvat sen ympärille.

**Lomakkeen yksilöinti** suunnitellaan rakenteellisesti yleiseksi — minkä tahansa uuden hoitomuodon lisääminen onnistuu hoitajan toimesta editorin kautta ilman koodimuutosta. Tuettavat hoitomuodot oman käytön alkuun: jäsenkorjaus, klassinen hieronta, tantrahieronta, energiahoito.

**Arkkitehtuuriperiaate:** Yksi yhteinen pohjalomake (perustiedot, sairaudet, lääkitys, esteet hoidolle) + palvelukohtaiset lisäosiot päälle. Lomakepohjien rakentaminen tapahtuu rasti ruutuun -tyyliin: hoitaja valitsee editorissa mitkä osiot tähän palveluun tulevat. Asiakas täyttää valmiin lomakkeen — ei voi muuttaa rakennetta.

---

## Vaiheet ja status

| # | Vaihe | Status | Aikaarvio |
|---|-------|--------|-----------|
| A | Palvelukohtainen asiakaslomake + perusrekisteri | 🟡 Käynnissä | 2–3 vk |
| B | Hoitajan kirjauspuoli | ⚪ Odottaa | 3–4 vk |
| C | Asiakasportaali | ⚪ Odottaa | 2–3 vk |
| D | Julkinen sivusto | ⚪ Odottaa | 2–3 vk |
| E | Oma ajanvaraus (korvaa Vellon) | ⚪ Odottaa | 3–5 vk |
| F | Maksut (Stripe) | ⚪ Odottaa | 1–2 vk |
| G | Skaalaus muille hoitajille | ⚪ Odottaa | iso, monta vaihetta |

**Status-merkit:** 🟢 Valmis · 🟡 Käynnissä · ⚪ Odottaa · 🔴 Jumissa

**Aikabudjetti:** 10–20 h/viikkotyöpanos. Vaiheet A–F valmiina noin 13–20 viikkoa aktiivisesta aloituksesta.

---

## Käyttäjäpolut ja laitteet

### Hoitajan polku (Oxa)

- **PC ensisijaisesti** — editorit, asetukset, suunnittelutyö, raportit
- **Tabletti hoitohuoneessa** — kirjaukset hoidon aikana, uuden asiakkaan rekisteröinti paikan päällä
- **Puhelin tukena** — pikatarkistus aikatauluun, asiakkaan tietoihin liikkeellä ollessa

### Asiakkaan polku

- **Puhelin ensisijaisesti** — suurin ja kasvava käyttäjäryhmä
- **PC tuettu** — vakiintuneet asiakkaat varaavat aikoja PC:llä
- **Tabletti hoitohuoneessa** — asiakas voi täyttää lomakkeen paikan päällä jos ei ole etukäteen tehnyt sitä

### Suunnitteluperiaate

**Hoitajan käyttöliittymä = PC-first.** Asiakkaan käyttöliittymä = mobile-first. Tabletti-käyttö tukee molempia kerroksia.

---

## Vaihe A — Palvelukohtainen asiakaslomake + perusrekisteri

**Aikaarvio:** 2–3 viikkoa

**Tavoite:** Ensimmäinen täysi käyttöönotto. Sähköinen lomake on käytössä ja paperilomakkeesta luovutaan (paperi vain hätävarana jos verkkoyhteys ei toimi).

**Sisältö:**

- Editori (ROADMAPin nykyinen 3C) loppuun viety — palvelukohtaisten lomakepohjien luonti rasti ruutuun -tyyliin
- Palvelu-linkitys (ROADMAPin lykätty 3 B+) — lomake + palvelu pari toimii. **Nostettu ydintehtäväksi.**
- Pohjalomake (perustiedot, sairaudet, lääkitys, esteet) + palvelukohtaiset variantit (jäsenkorjaus, klassinen hieronta, tantrahieronta, energiahoito ensin — muiden lisäys onnistuu editorista jatkossa)
- Sähköpostitunnistautuminen lomakkeessa (sähköposti = tunniste, tulee toimimaan myös portaalin kirjautumisessa)
- Asiakkaan automaattinen rekisteröityminen lomakkeen täytön yhteydessä
- "Kiitos" + Vello-linkki ohjautuminen lomakkeen jälkeen
- Kotisivun ajanvarauspainike muutetaan: johtaa nyt ensin lomakkeeseen, sitten Velloon
- Mobile-first asiakaskäyttöliittymä — toimii puhelimella ensisijaisesti

**Lopputulos:**
Asiakkaat täyttävät lomakkeen sähköisesti — joko etukäteen kotona tai hoitohuoneessa tabletilla. Saat tiedot ennen hoitoa, voit valmistautua. Paperilomakkeesta luovutaan.

---

## Vaihe B — Hoitajan kirjauspuoli

**Aikaarvio:** 3–4 viikkoa

**Tavoite:** Olet kokonaan paperiton. Hoitokirjaukset digitaalisia, vertailukelpoisia, helposti löydettäviä.

**Sisältö:**

- Hoitajan oma osa lomakkeesta — strukturoidut kentät havainnoille (kallistumat, kiertymät, asentomuutokset)
- Mittaustulokset rakenteellisesti tallennettuna (numerot, liukusäätimet, vaaitus)
- **Mittaustulosten 3 tasoa:**
  - **Automatiikka** — kehonkartta-piirroksesta vyöhyke-yhteenveto, AI-tunnistus puhelinkuvista (kulmat, asennot)
  - **Erilliset kentät** — strukturoidut kentät joihin hoitaja kirjaa itse
  - **Vertailu edelliseen** — "viime kerralla X, nyt?" -formaatti
- Hoidon kulun ja jatkohoitojen suositusten kirjaus
- Asiakkaan ohjeistusten kirjaus (ylläpito-ohjeet, oireiden välttäminen)
- Hoitokerta = lomake-snapshot -logiikka
- Jatkohoidoissa edellisten käyntien näkyminen kronologisesti
- Tablet-optimoitu hoitohuonekäyttö
- **Offline-pääsy** — paikallinen tallennus selaimeen jos verkkoyhteys ei toimi, synkronointi serverille kun yhteys palaa

---

## Vaihe C — Asiakasportaali

**Aikaarvio:** 2–3 viikkoa

**Tavoite:** Asiakkaalla on "oma paikka" jossa kaikki tiedot ja ohjeet ovat tallessa. Tarvitaan viimeistään kun hoidoista alkaa kertyä mittausdataa.

**Sisältö:**

- Asiakas kirjautuu sähköpostilinkillä (passwordless — turvallisempi ja yksinkertaisempi)
- Asiakas näkee omat tietonsa ja voi päivittää niitä
- Hoidon jälkeiset ohjeistukset näkyvät portaalissa (korvaa paperilla annetut ohjeet)
- Mittausdata kronologisesti — asiakas näkee oman edistymisensä
- Asiakas voi varata jatkohoitoja — alkuun linkki Velloon, myöhemmin omaan ajanvaraukseen
- Hoitohistorian selailu

---

## Vaihe D — Julkinen sivusto

**Aikaarvio:** 2–3 viikkoa

**Tavoite:** Korvaa kalevalapaja.fi (WordPress poistuu).

**Sisältö:**

- Palveluesittelyt jokaiselle hoitomuodolle
- Suora ajanvarauspainike palvelukohtaisesti — vie palvelua vastaavaan lomakkeeseen
- Hoitajaesittely
- Yhteystiedot
- Tietosuojaseloste
- Mahdolliset blogiartikkelit / itsehoito-ohjeet (myöhemmin)

**Päätökset tässä vaiheessa:**

- Domain — kalevalapaja.fi vai uusi (esim. kehokorjaamo.fi)?

---

## Vaihe E — Oma ajanvaraus

**Aikaarvio:** 3–5 viikkoa (iso työ)

**Tavoite:** Korvaa Vellon kokonaan. Vello-tilaus voidaan irtisanoa.

**Sisältö:**

- Hoitaja: vapaat ajat, lomat, säännölliset poikkeukset
- Hoitaja: jatkoajan varaaminen suoraan hoidon päätyttyä asiakkaalle
- Asiakas: kalenteri-näkymä, ajan valinta (mobile-first)
- Vahvistus-sähköpostit
- Peruutukset ja muutokset
- Tuplabookkausten esto

---

## Vaihe F — Maksut

**Aikaarvio:** 1–2 viikkoa

**Tavoite:** Yksittäinen sovellus hoitaa varauksen, esitiedot, hoidon kirjaukset ja maksun.

**Sisältö:**

- Stripe-integraatio
- Asiakas maksaa varauksen yhteydessä TAI hoidon jälkeen (kumpi sopii paremmin)
- Maksuhistoria sinulle ja asiakkaalle
- Kuitit automaattisesti sähköpostilla

---

## Vaihe G — Skaalaus muille hoitajille

**Aikaarvio:** Iso kokonaisuus, monta vaihetta.

**Tavoite:** Kehokorjaamo-App muuttuu omasta työkalusta tuotteeksi joka myydään muille hoitajille.

**Sisältö:**

- Multi-tenant kunnolla — useat hoitajat saman sovelluksen alla, kukin näkee vain omat asiakkaansa
- Tilausjärjestelmä (Stripe-tilaukset hoitajille — kuukausimaksu)
- Hoitajan oman lomakepohja-/palveluvalikoiman luonti editorista (yleinen rakenne tukee mitä tahansa hoitomuotoa)
- Verotus- ja raportointityökalut
- Asiakaspalvelu (ohjeet, tukikanavat)
- Markkinointiprosessi muille hoitajille

---

## Läpileikkaavat ominaisuudet

Nämä eivät kuulu yhteen vaiheeseen vaan vaikuttavat useaan.

### Vanhojen paperilomakkeiden skannaus → digitointi

Mahdollisuus skannata vanhoja paperisia asiakastietolomakkeita ja siirtää tiedot asiakasrekisteriin. Toteutus: kuva → AI-tunnistus → kentät esitäytetään → hoitaja tarkistaa ja vahvistaa. Lisätään vaiheeseen A (perusrekisteri) tai B (kun rekisteri on toiminnassa).

### Offline-pääsy hoitokirjauksiin

Hoitohuoneessa pitää voida kirjata jos verkkoyhteys ei toimi. Toteutus: paikallinen tallennus selaimeen (IndexedDB tai vastaava), synkronointi serverille kun yhteys palaa. Lisätään vaiheeseen B.

### Automaattinen ROADMAP/PROJEKTIMUISTI -versionhallinta

Aina kun keskustelussa tehdään iso päätös tai muutos suunnitelmaan, Claude tarjoutuu automaattisesti päivittämään ROADMAP.md ja PROJEKTIMUISTI.md ja työntämään muutokset GitHubiin. Tämä on osa työnkulkua, ei sovelluksen ominaisuus.

---

## Periaatteet — älä riko näitä

### Säilytetyt periaatteet

1. **Yksi lomake koko ketjun ajan** — ei erillisiä komponentteja eri vaiheille. Asiakkaan lomake ja hoitajan kirjaukset yhdistyvät asiakasrekisterissä.
2. **Osio kerrallaan -navigointi** (pyyhkäisy + nuolet)
3. **MVP-disciplina** — toimiva paketti ensin, kehitys käytön myötä
4. **AI ehdottaa, hoitaja päättää** — kaikki AI-tuotettu sisältö on ehdotuksia
5. **Vertailukelpoisuus** — hoitokäyntien data tallennetaan rakenteellisesti
6. **Yksi totuuden lähde** — Supabase, ei duplikoitua dataa
7. **Suomenkieliset muuttujanimet** — `asiakas`, `hoitokaynti`, `havainnot`
8. **Null-suoja** — kaikkialla missä luetaan tietokannasta
9. **Yhden vastuun periaate** — yksi funktio = yksi tehtävä
10. **RLS aina päällä** — hoitaja näkee vain omat asiakkaansa
11. **Versiointi** — hoitokerta = lomake-snapshot
12. **Vahinkopainallusten esto** — isot kosketuspinnat, välit, kumoa-toiminto, pyyhkäisy-minimimatka
13. **Helppokäyttöisyys ennen kaikkea** — *"Onko tämä helppo Oxalle kiireisenä päivänä?"* on jokaisen päätöksen testi
14. **Pieni pala kerrallaan** — ei isoja "tee kaikki" -pyyntöjä
15. **Passwordless-kirjautuminen** asiakasportaaliin — vain sähköpostilinkki
16. **Joustavuus** — referenssitaulut hoitajan muokattavissa, `lisakentat`-jsonb tulevaisuutta varten

### Päivitetyt ja uudet periaatteet

17. **Hoitajan käyttöliittymä = PC-first, asiakkaan käyttöliittymä = mobile-first.** Tabletti-käyttö tukee molempia kerroksia. (Korvaa aiemman "mobiili ensin" -yleisperiaatteen.)
18. **Etsi vaihtoehtoja ja suosittele.** AI ei mene yhdellä tavalla suoraan — esittää 2–3 toteutusvaihtoehtoa kun tilanne sen sallii. Hoitaja valitsee suunnan, AI toteuttaa.
19. **Build for one, design for many.** Toiminnallisesti rakennetaan yhdelle hoitajalle (Oxalle) alkuun, mutta arkkitehtuuripäätöksiä ei tehdä siten että ne estävät myöhempää multi-tenant-laajennusta. Esim. asiakas-rivit kuuluvat aina jollekin hoitajalle (UUID), vaikka hoitajia on vain yksi nyt. Lomakepohjarakenne, palvelukirjasto ja kenttäkirjasto ovat yleisiä — eivät lukittu tiettyihin hoitomuotoihin.

---

## Avoimet kysymykset

Nämä on tunnistettu mutta ei vielä päätetty:

- **Vanhat paperilomakkeet:** skannataan kaikki vai aloitetaanko digitaalisesti puhtaalta pöydältä? (Skannaus on lisätty läpileikkaavaksi ominaisuudeksi.)
- **Domain (vaihe D):** kalevalapaja.fi pidetään, kalevalapaja.fi käytetään uudelle, vai uusi domain (esim. kehokorjaamo.fi)?
- **Maksut (vaihe F):** varauksen yhteydessä, hoidon jälkeen, vai molemmat vaihtoehdot?
- **Hoitajan kehonkartta** osio 6: pidetään olemassa oleva BodyMap.jsx vai muutetaan
- **Multi-tenant arkkitehtuuri (vaihe G):** miten skaalataan kun muutkin hoitajat alkavat käyttää
- **Sähköposti-ilmoitukset:** Edge functions Supabasessa vai ulkopuolinen palvelu
- **Sähköpostimuistutusten automatisointi:** nykyinen viikon päästä lähtevä muistutus → milloin automatisoidaan
- **Tietosuojaseloste:** vaiheessa D luodaan virallinen, alkuun voi olla väliaikainen linkki

---

## Avoimet ideat — myöhemmin

Nämä eivät ole vaiheissa, mutta on hyvä muistaa:

- **Lapsihahmo, raskaana olevan hahmo, sukupuolineutraali hahmo** kehonkartassa
- **Hoitaja voi lisätä asiakkaan ilman sähköpostia** (yleisötapahtumat, iäkkäät asiakkaat) — sähköposti suositeltu mutta ei pakollinen kun hoitaja täyttää
- **Asiakas voi päivittää oiretilannetta portaalissa** (vaihe C) — hoitaja näkee päivityksen ennen seuraavaa hoitoa
- **Hoitaja voi pyytää lomakkeen päivitystä** sähköpostilla jos asiakkaan tiedot ovat vanhat
- **Aikaperusteinen tarkistus** — yli 6 kk taukoa → muistutus tarkistaa tiedot, yli 2 v → koko lomake uudestaan
- **Palvelukohtaiset erikoiskysymykset** — esim. tantrahieronnassa tietoiset suostumukset
- **Sähköpostimuistutukset** — automaattisesti ennen hoitokäyntiä
- **Kontraindikaatio-AI** — varoittaa automaattisesti hoitomenetelmästä jos sairaus
- **Tarjoukset asiakkaille** — esim. paketit, alennukset
- **Hoitosarjojen seuranta** — "asiakkaalla 3/5 hoitoa käytetty"
- **AI-tuki hoidon aikana** — ehdotukset hoitosuunnitelmaan, hoitaja hyväksyy
- **Automaattinen laadunvarmistus** — yhden napin koodianalyysi (vaihe G:n jälkeen tai erillisenä)
- **Itsehoito-harjoituskirjasto** — ohjeet ja videot asiakkaille portaaliin
- **Kalevala Syndicate -integraatio** — Discord-yhteys
- **Espanja-muutto** — varmistettava että sovellus toimii etänä

---

## Domain ja hosting

**Nykyinen tilanne:**

- `kehokorjaamo-app.vercel.app` (kehitysympäristö)
- `kalevalapaja.fi` (WordPress, Hostinger/Domainhotelli)
- Nykyinen ajanvaraus: Vello

**Ratkaisu päätetään vaiheessa D (julkinen sivusto):**

- Vaihtoehto A: kalevalapaja.fi → uusi sovellus, WordPress pois
- Vaihtoehto B: app.kalevalapaja.fi sovellukselle, kalevalapaja.fi pysyy
- Vaihtoehto C: oma domain (esim. kehokorjaamo.fi)

---

## Vanha numerointi (1–10) → uusi (A–G)

Aiemman ROADMAPin vaiheet kuvattuna uuteen järjestykseen:

| Vanha | Uusi | Huomio |
|-------|------|--------|
| Vaihe 1 (osiot 1–5 hoitajan käyttöön) + Vaihe 4 (sähköinen lomake asiakkaalle) | **Vaihe A** | Yhdistetty — yksi lomake, kaksi käyttöpolkua |
| Vaihe 2 (osiot 6–8 hoitajan kirjaus) | **Vaihe B** | Erotettu omaksi vaiheeksi |
| Vaihe 3 (lomakepohjat + editori + palvelu-linkitys) — A+B valmiit, C käynnissä, B+ lykätty | Osa **vaihetta A** | B+ palvelu-linkitys nostettu ydintehtäväksi |
| Vaihe 5 (asiakasportaali) | **Vaihe C** | — |
| Vaihe 6 (julkinen sivusto) | **Vaihe D** | — |
| Vaihe 7 (ajanvaraus) | **Vaihe E** | — |
| Vaihe 8 (automaattinen laadunvarmistus) | Avoimet ideat | Siirretty erillisenä projektina vaiheen G jälkeen |
| Vaihe 9 (AI-tuki hoidon aikana) | Avoimet ideat | Toteutuu osittain vaiheessa B (mittausautomatiikka) |
| Vaihe 10 (skaalaus, multi-tenant) | **Vaihe G** | + Multi-tenant-ajattelu otetaan periaatetasolla mukaan alusta asti |
| (uusi) | **Vaihe F** | Maksut omaksi vaiheeksi |
