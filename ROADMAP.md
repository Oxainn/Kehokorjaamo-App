# Kehokorjaamo App — Roadmap

> **Tarkoitus:** Tämä tiedosto kertoo missä mennään ja minne ollaan menossa.
> Päivitä aina kun vaihe valmistuu tai suunnitelma muuttuu.
> Kun aloitat uuden Claude-chatin, voit sanoa: *"Lue ROADMAP.md ja jatka vaiheesta X"*.

**Viimeisin päivitys:** 2026-05-01 (myöhäisempi sessio — Vaihe A 🟢 + Vaihe B 🟢 valmis)

---

## Tuotenäkemys

Kehokorjaamo-App on **täysi alustatuote** joka korvaa kaiken hoitohuoneen pyörittämiseen tarvittavan: kotisivun, ajanvarauksen, asiakasrekisterin, hoitokirjaukset, maksut. Pitkän aikavälin tavoite on tehdä tästä **laajemmalle hoitaja-/terapeuttikunnalle myytävissä oleva tuote**.

**Asiakastietolomake on tuotteen ydin.** Kaikki muut osat (rekisteri, ajanvaraus, portaali, maksut) rakentuvat sen ympärille.

**Lomakkeen yksilöinti** suunnitellaan rakenteellisesti yleiseksi — minkä tahansa uuden hoitomuodon lisääminen onnistuu hoitajan toimesta editorin kautta ilman koodimuutosta. Tuettavat hoitomuodot oman käytön alkuun: jäsenkorjaus, klassinen hieronta, tantrahieronta, energiahoito.

**Arkkitehtuuriperiaate:** Yksi yhteinen pohjalomake (perustiedot, sairaudet, lääkitys, esteet hoidolle) + palvelukohtaiset lisäosiot päälle. Lomakepohjien rakentaminen tapahtuu rasti ruutuun -tyyliin: hoitaja valitsee editorissa mitkä osiot tähän palveluun tulevat. Asiakas täyttää valmiin lomakkeen — ei voi muuttaa rakennetta.

**Palvelu↔lomake-suhde:** 1:N. Yksi palvelu käyttää aina yhtä lomaketta. Sama lomake voi olla useassa palvelussa (esim. "Jäsenkorjaus-lomake" voidaan liittää sekä "Jäsenkorjaus 1. hoitokerta" että "Jäsenkorjaus jatkohoito" -palveluihin).

---

## Vaiheet ja status

| # | Vaihe | Status | Aikaarvio |
|---|-------|--------|-----------|
| A | Palvelukohtainen asiakaslomake + perusrekisteri | 🟢 Valmis (tuotannossa oikeilla asiakkailla 1.5.2026) | 2–3 vk |
| B | Hoitajan kirjauspuoli | 🟢 Valmis (1.5.2026) — paperiton hoitokirjaus | 3–4 vk |
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

- 🟢 **Runtime-renderöijä** — geneerinen pohjasta lomakkeen renderöivä komponentti (22 kenttätyyppiä, 3 näyttötyyliä, validointi, tallennus). Korvaa vanhan Asiakastietolomakkeen tuotannossa. Valmis 30.4.2026.
- 🟢 **Editori (ROADMAPin nykyinen 3C) loppuun viety** — palvelukohtaisten lomakepohjien luonti rasti ruutuun -tyyliin. Osioiden + kenttien hallinta, esikatselu, uuden kentän luonti kenttäkirjastoon. Valmis 30.4.2026.
- 🟢 **Palvelu↔lomake-suhde 1:N** — palvelut.lomakepohja_id (FK). Yksi palvelu käyttää yhtä lomaketta, sama lomake voi olla useassa palvelussa. Aiempi N:M-suhde (palvelu_lomake_linkit-välitaulu) hylätty 2026-05-01 — johti epäselvyyteen oletuspohjista. Valmis 1.5.2026.
- 🟢 **Yhdistetty Asetukset → Palvelut & lomakkeet -näkymä** — palvelukortti näyttää lomakkeen, "Vaihda" -nappi avaa modaalin pohjan vaihtamiseen. Lomakepohjien yleishallinta avattavassa paneelissa alaosassa. Aiemmat erilliset osiot ("Asiakastietolomakkeet" ja "Palvelut") yhdistetty palvelu-keskeisesti. Valmis 1.5.2026.
- ⚪ Palvelukohtaiset variantit (jäsenkorjaus, klassinen hieronta, tantrahieronta, energiahoito ensin — muiden lisäys onnistuu editorista jatkossa). **Hoitaja luo palvelut itse Asetuksissa** — alkuperäinen "migraatio luo 4 oletuspalvelua" hylätty (2026-04-30 päätös: pidetään tyhjä alku jotta hoitajan vapaus säilyy).
- 🟡 **Sähköpostitunnistautuminen lomakkeessa** — magic-link toiminnallisuus rakennettu, mutta toistaiseksi pois käytöstä (2026-05-01) koska asiakasportaalia (Vaihe C) ei ole. Palautetaan kun /portaali-reitti valmistuu.
- 🟢 **Asiakkaan automaattinen rekisteröityminen** lomakkeen täytön yhteydessä. Edge Function `tallenna-julkinen-lomake` upsert sähköpostin perusteella (saman hoitajan rekisterissä). Valmis 30.4.2026.
- 🟢 **"Kiitos" + Vello-linkki ohjautuminen** — kelluva auto-close modaali (6s, manuaalinen Sulje-nappi) + Vello aukeaa uudessa välilehdessä jos `palvelut.varauslinkki_url` on asetettu. Magic link -viesti siirretty Vaihe C:hen. Valmis 1.5.2026.
- ⚪ Kotisivun ajanvarauspainike muutetaan: johtaa nyt ensin lomakkeeseen, sitten Velloon. **Kuuluu Vaihe D:hen** (julkinen sivusto / kalevalapaja.fi:n korvaus). Lomake on jo valmis: avautuu URL `https://kehokorjaamo-app.vercel.app/?palvelu=PALVELU_ID`.
- 🟢 **Mobile-first asiakaskäyttöliittymä** — toimii puhelimella ensisijaisesti. Renderöijän kenttäkomponentit suunniteltu mobiili-painotteisesti. Valmis.
- 🟢 **Migraatiotiedostot palveluille** — `palvelut`- ja aiempi `palvelu_lomake_linkit`-taulu reverse-engineerattu tuotannosta SQL-tiedostoiksi (20260501_palvelut_1n_suhde.sql). Repon kloonaaja voi rakentaa skeeman pelkillä migraatioilla. Valmis 1.5.2026.

**Lopputulos:**
Asiakkaat täyttävät lomakkeen sähköisesti — joko etukäteen kotona tai hoitohuoneessa tabletilla. Saat tiedot ennen hoitoa, voit valmistautua. Paperilomakkeesta luovutaan.

---

## Vaihe B — Hoitajan kirjauspuoli

**Status:** 🟢 Valmis 1.5.2026 — paperiton hoitokirjaus tuotannossa.

**Aikaarvio:** 3–4 viikkoa (toteutui yhdellä intensiivisellä sessiolla)

**Tavoite:** Olet kokonaan paperiton. Hoitokirjaukset digitaalisia, vertailukelpoisia, helposti löydettäviä.

**Toteutuneet palat (B1–B9b):**

- 🟢 **B1** — Hoitokirjaus-näkymän pohja: käynnin perustiedot, A/B-lomake-terminologia, automaattinen kytkentä A-lomakkeen suljettuun versioon (snapshot)
- 🟢 **B2** — BodyMap-havainnot (8 anatomista aluetta), hoitoraportti (lähtötilanne, kulku, "Muista ensi kerralla"-nosto), edellisen käynnin Muista-nosto seuraavalle
- 🟢 **B3** — 15 linjausmittaria liukusäätimillä (lantion kulmat, Q-kulmat, niskan käännökset, navicular drop, akillesjänne)
- 🟢 **B4** — Mittausarvojen vertailu edelliseen + parannus/heikennys-tulkinta (delta + tavoite-etäisyys)
- 🟢 **B5** — Itsehoito-kirjasto editorinäkymä Asetuksiin (kohdealueet, toistot, frekvenssi, varoitukset)
- 🟢 **B6** — Yksilöllisen itsehoito-ohjelman koonti käynnin yhteydessä + älykäs aluefiltteri + PDF-tuloste
- 🟢 **B6.5** — Hoitosarjan logiikka: N/M käyntilaskuri, automaattinen seuraavan käynnin pvm-ehdotus, sarjan päätöksen huomautus
- 🟢 **B6.6** — Asiakkaan kehonkartta hoitajan vertailunäkymänä: yhteneväiset / hiljaiset jännitykset / asiakkaan oireet ilman löydöstä
- 🟢 **B7** — Hoitokertomus PDF laajennettu: havainnot, mittaukset, hoitoraportti, jatkohoitosuunnitelma; GDPR-tietopaketista jätetään pois "Muista ensi kerralla"
- 🟢 **B8** — AI-analyysi löydöksistä (Anthropic Claude haiku, Edge Function, markdown-vastaus, cache + rate-limit 30/h ja 200/24h, kvoot-laskuri UI:ssa)
- 🟢 **B9a** — Tablet-optimointi: hit-areat ≥44px, range-thumb 24-28px, modaalit täysruutu, touch-action: manipulation, 16px input-fontti
- 🟢 **B9b** — Offline-tallennus + synkronointi: PWA Service Worker (network-first), IndexedDB-jono epäonnistuneille tallennuksille, online/offline-indikaattori, automaattinen sync yhteyden palatessa, AI/PDF/uusi käynti vaativat verkon

**Vaihe B tarkistus (1.5.2026 myöhempi sessio):** korjattu kesto-validointi (NaN-suoja), AI-race-condition (pyyntoIdRef), offline-jonon Promise.all, AI-tallennus upsertilla (uniikki rajoite), itsehoito-harjoituksen poisto → vain arkistointi (FK CASCADE → RESTRICT, datan eheys), useEscKey-yhteinen hook, 15 mittarin DB-CHECK-constraintit, vahvistuksen tyhjä B-lomake poistettu, AI-rate-limit (ai_kutsu_loki-taulu), osittainen tallennusvirhe per-osio + retry, optimistinen lukko hoitokäynnille (versio-sarake) + beforeunload-varoitus.

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
- **Päivämäärän esitysmuoto suomeksi** — `<input type="date">` käyttää selaimen lokaalia, mikä riittää useimpiin tapauksiin. Erikseen formaatin pakottaminen vaatisi custom-pickerin. Tehdään myöhemmin jos osoittautuu tarpeelliseksi (2026-05-01 päätös: ei prioriteetti Vaihe A:lle).
- **Magic link palautus** — passwordless-kirjautuminen lomakkeen lähetyksen jälkeen palautetaan käyttöön kun Vaihe C (asiakasportaali) valmistuu
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
