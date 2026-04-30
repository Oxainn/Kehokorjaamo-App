# Kehokorjaamo App — Projektimuisti

> **Tarkoitus:** Tämä tiedosto kerää tehdyt päätökset, periaatteet ja hylätyt vaihtoehdot.
> Roadmap kertoo mitä tehdään, projektimuisti kertoo miksi.
> Päivitä kun teet ison päätöksen.

**Viimeisin päivitys:** 2026-04-30

---

## Käytössä olevat työkalut

- **Frontend:** React + Vite + Tailwind
- **Hosting:** Vercel (kehokorjaamo-app.vercel.app)
- **Database + Auth:** Supabase (PKCE-flow, projekti-ID `uwysictfbzswecnxvmif`)
- **Versionhallinta:** GitHub (`oxainn/Kehokorjaamo-App`)
- **AI-koodaus:** Claude Code + Claude Chat (Claude Max -tilaus)
- **Domain (nykyinen):** kehokorjaamo-app.vercel.app
- **Domain (tuleva):** päätetään vaiheessa D, ks. Roadmap
- **Ajanvaraus (nykyinen):** Vello, korvataan vaiheessa E
- **Sähköpostimuistutukset:** käsin lähetetty viikon päästä hoidosta (säilytetään, automatisoidaan myöhemmin)

---

## Olemassa olevat komponentit (säilytetään tai parannetaan)

| Komponentti | Tila | Toimenpide |
|-------------|------|------------|
| Kehonkartta (`ClientForm.jsx`) | ✅ Toimii | Parannus: vapaa piirtäminen + automaattinen vyöhyke-tunnistus (Vaihe B) |
| Kehon vyöhykkeet (`kehonVyohykkeet.js`) | ✅ Toimii | Pidetään (35 vyöhykettä) |
| Suostumukset-osa (allekirjoitus + GDPR) | ✅ Toimii | Käytetään sellaisenaan |
| `useAsiakkaanSairaudet`-hook | ✅ Toimii | Käytetään uudessa lomakkeessa |
| `normalisoiAsiakas`-funktio | ✅ Päivitetty | Käytetään |
| Tietokanta (14 taulua) | ✅ Valmis | Pieni viilaus tarvittaessa |
| Lomakepohja-järjestelmä A (tietokanta + 3 aloituspohjaa) | ✅ Valmis (29.4.2026) | — |
| Lomakekirjasto-käyttöliittymä B | ✅ Valmis (29.4.2026) | — |
| Editori (vaihe C) | 🟢 Valmis (30.4.2026) | Osioiden + kenttien CRUD, esikatselu, uuden kentän luonti, versionti |
| Runtime-renderöijä | 🟢 Valmis (30.4.2026) | 22 kenttätyyppiä, 3 näyttötyyliä, validointi, tallennus hybridi-arkkitehtuurilla |

---

## Tietokanta — rakenne ja päätökset

### Päätaulut

| Taulu | Tarkoitus | Versionti? |
|-------|-----------|------------|
| `asiakkaat` | Henkilötiedot (nykyiset) | Ei |
| `asiakastietolomake_versiot` | Lomake-snapshotit (yksi per hoitokerta) | **Kyllä** |
| `lomake_sairaudet` | Mitkä sairaudet rastitettu | (versiokohtainen) |
| `hoitokaynnit` | Yksi rivi per käynti | Snapshot lomakeversioon |
| `kaynnin_esitiedot` | Päivän kunto, uni, stressi | Käyntikohtainen |
| `havainnot` | Asentomuutokset + rakenteelliset | Käyntikohtainen |
| `kuvantamiset` | Kuvat + lasketut kulmat | Käyntikohtainen |
| `hoitosuunnitelma` | Elävä, 1/asiakas | Päivittyy |
| `itsehoito_ohjelma` | Kasvava, 1/asiakas | Kasvaa |
| `itsehoito_harjoitukset` | Yksittäiset harjoitukset | - |
| `ai_ehdotukset` | AI:n ehdotukset + hyväksynnät | Säilytetään historia |
| `productboard` | Tuotekehityksen ideat ja todo | - |

### Lomakepohja-taulut (vaiheen A pohja)

- `lomakepohjat` — pohjien metatiedot
- `lomakepohja_versiot` — pohjien JSON-rakenne, versioitu
- `kenttakirjasto` — kenttien yhteinen kirjasto
- `kentan_versiot` — kenttien versiot
- `palvelu_lomake_linkit` — välitaulu palvelu↔lomakepohja (Vaihe A — nostettu lykätyltä listalta)

### Referenssitaulut (muokattavissa)

- `sairaus_tyypit` — 24 sairautta, kontraindikaatio-merkintä, hoitajan muokattavissa
- `anatomiset_alueet` — 10 aluetta lomakkeen sivun 2 mukaan
- `asentomuutos_tyypit` — 5 tyyppiä (kallistus, siirtymä, kierto, taivutus, mittaero)

**Periaate:** Listoja voi laajentaa ilman koodimuutosta — vain rivin lisäys.

### Apunäkymät

- `asiakkaan_nykyinen_lomake` — yhdistää asiakkaan ja voimassa olevan lomakeversion
- `hoitokaynnit_yhteenveto` — lista hoitajalle
- `asiakkaan_kontraindikaatiot` — varoitukset suoraan

**Tärkeää:** Näkymät käyttävät `security_invoker = true` — kunnioittavat RLS:ää.

### Versiointi-logiikka — periaate (28.4.2026)

**Hoitokerta = lomake-snapshot:**

- Jokainen hoitokerta tuo mukanaan oman lomake-versionsa
- Ennen hoitoa: tarkistetaan tiedot asiakkaan kanssa, päivitetään jos tarpeen
- Tallennetaan kyseiseen hoitokertaan
- Vertailukelpoisuus käyntien välillä syntyy automaattisesti

**Identiteetti — Y-malli:**

- Asiakkaalla pysyvä UUID-id (ei koskaan muutu)
- Asiakkaalla "nykyiset tiedot" -kenttiä (helppo löytää listalta)
- Hoitokerralla "silloinen snapshot" (historia tallessa)
- Pieni duplikointi hyväksyttävä — selkeyden vuoksi

---

## Tehdyt päätökset

### 2026-04-30 — Tuotenäkemys laajeni alustatuotteeksi

**Päätös:** Kehokorjaamo-App on täysi alustatuote joka korvaa kotisivun, ajanvarauksen, asiakasrekisterin, hoitokirjaukset ja maksut. Pitkän aikavälin tavoite: laajemmalle hoitajakunnalle myytävissä oleva tuote.

**Miksi:** Käyttäjä artikuloi vision selkeästi visiokeskustelussa. Aiempi roadmap käsitteli sovellusta lähinnä yhden hoitajan apuvälineenä — nyt rakennetaan tuotetta.

**Vaikutus:** Kaikki suunnittelupäätökset tehdään muistaen että tämä menee joskus muillekin. Lomakepohjarakenne, palvelukirjasto ja kenttäkirjasto suunnitellaan yleisiksi — eivät lukittu Oxan neljään hoitomuotoon.

### 2026-04-30 — Asiakaspolku ohjaa rakennusjärjestyksen

**Päätös:** Roadmapin järjestys uudistettu (vaiheet A–G). Asiakaslomake on tuotteen ydin ja kaikki muu rakentuu sen ympärille.

**Miksi:** Aiempi järjestys (1→10) eteni teknisestä kerrostuksesta — hoitajan työkalu ennen asiakaslomaketta. Mutta käyttäjän vision mukaan asiakaslomake on pääosa, ja hoitajan kirjauspuoli rakentuu sen rinnalle. Aiemmin lykätty "palvelu-linkitys" (3 B+) nostettu ydintehtäväksi koska se on vaihtoehtoisesti välttämätön tuotenäkemyksen kannalta.

**Vaikutus:**

- Vaihe A (uusi) yhdistää vanhan vaiheen 1 ja vaiheen 4 — yksi lomake, kaksi käyttöpolkua
- Multi-tenant-ajattelu (vanha vaihe 10) otetaan mukaan periaatteena alusta asti
- Maksut (vaihe F) erotettu omaksi vaiheeksi

### 2026-04-30 — Hoitaja PC-first, asiakas mobile-first

**Päätös:** Hoitajan käyttöliittymä suunnitellaan PC:lle ensisijaisesti (editorit, asetukset, raportit). Asiakkaan käyttöliittymä suunnitellaan puhelimelle ensisijaisesti. Tabletti tukee molempia kerroksia (hoitohuonekäyttö, asiakkaan paikan päällä täyttäminen).

**Miksi:** Käyttäjän omat käyttötottumukset: hoitajatyö PC:llä, hoitohuoneessa tabletti, puhelin tukee. Asiakkaat käyttävät kasvavasti puhelinta varauksiin, mutta vakiintuneet asiakkaat PC:llä.

**Vaikutus:** Aiempi yleisperiaate "mobiili ensin" korvautuu kahdella eri ohjeella eri käyttäjille. Tämä on iso muutos joka vaikuttaa kaikkiin UI-päätöksiin.

### 2026-04-30 — Lomakepohjat rakennetaan rasti ruutuun -tyyliin

**Päätös:** Editorissa hoitaja valitsee rastittamalla mitkä osiot tähän palveluun lomakkeeseen tulevat. Asiakas täyttää valmiin lomakkeen — ei voi muuttaa rakennetta.

**Miksi:** Käyttäjä halusi joustavan rakennustavan jossa eri palveluille saa eri kysymykset. Lego-palikkamalli on selkeä mentaalimalli ja skaalautuu mille tahansa palvelumäärälle.

**Vaikutus:** Editorin (vaihe A) toteutuksen keskeinen elementti on osio-kirjasto + tarkistuslista UI.

### 2026-04-30 — Mittaustulokset 3 tasolla

**Päätös:** Hoitajan kirjauspuoli (vaihe B) tukee mittaustuloksia kolmella tavalla yhtä aikaa:

- **A — Automatiikka:** kehonkartta-piirroksesta vyöhyke-yhteenveto, AI-tunnistus puhelinkuvista (kulmat, asennot)
- **B — Erilliset kentät:** strukturoidut kentät joihin hoitaja kirjaa itse (numero, liukusäädin, vaaitus)
- **C — Vertailu edelliseen:** "viime kerralla X, nyt?" -formaatti

**Miksi:** Eri mittauksiin sopii eri tapa. Asentomuutokset voi tunnistaa kuvasta, kipuasteet kirjataan käsin, ja kaikki vertailtavuus syntyy aikaisempien arvojen näyttämisestä.

### 2026-04-30 — Build for one, design for many

**Päätös:** Toiminnallisesti rakennetaan yhdelle hoitajalle (Oxalle) alkuun. Mutta arkkitehtuuripäätöksiä ei tehdä siten että ne estävät myöhempää multi-tenant-laajennusta.

**Miksi:** Tuotenäkemys on alustatuote muille hoitajille. Jos tähän mennessä rakennetaan vain yhdelle, monia päätöksiä joudutaan myöhemmin purkamaan ja rakentamaan uudelleen.

**Vaikutus:**

- Asiakas-rivit kuuluvat aina jollekin hoitajalle (UUID), vaikka hoitajia on vain yksi nyt
- Lomakepohjarakenne, palvelukirjasto ja kenttäkirjasto ovat yleisiä — eivät lukittu tiettyihin hoitomuotoihin
- RLS-säännöt tukee jo nyt monihoitajaista rakennetta

### 2026-04-30 — Aikabudjetti 10–20 h/viikko

**Päätös:** Käytettävissä oleva työpanos on 10–20 h viikossa, ei 4–8 h/vk kuten aiemmin oletettiin.

**Vaikutus:** Roadmapin aikataulut pidemmillä vaiheilla ovat realistisempia. Vaiheet A–F valmiina noin 13–20 viikossa.

### 2026-04-30 — Sähköisen lomakkeen valmistuttua paperi pois käytöstä

**Päätös:** Kun vaihe A on valmis, paperilomakkeesta luovutaan kokonaan. Paperi vain hätävarana jos verkkoyhteys ei toimi.

**Miksi:** Päällekkäisyys aiheuttaa sekaannusta. Asiakas täyttää joko sähköisesti etukäteen tai hoitohuoneessa tabletilla. Hätätilanne ratkaistaan offline-toiminnallisuudella (vaihe B), ei paluulla paperiin.

### 2026-04-30 — Pakollisuus pohjakohtaisesti, ei kenttäkirjastossa

**Päätös:** Kentän pakollisuus määräytyy **pohjarakenteessa** (`osio.kenttat[].pakollinen`-attribuutti), ei kenttäkirjastossa muuttumattomana ominaisuutena. Sama kenttä voi olla pakollinen yhdessä pohjassa ja valinnainen toisessa.

**Soveltava esimerkki — sähköposti:**

- **Hoitaja-näkymät** (paperilomakkeen täydennys, tabletilla hoitohuoneessa): `sahkoposti.pakollinen = false` — iäkäs asiakas voi olla ilman sähköpostia, hoitaja voi täyttää ilman.
- **Asiakas-täyttöpohjat** (asiakas itse täyttää etukäteen tai portaalissa): `sahkoposti.pakollinen = true` — sähköposti on asiakkaan tunniste portaalia ja muistutuksia varten.

**Miksi:** Kenttäkirjasto kuvaa kentän tyyppiä ja perusrakennetta — ei siitä, missä kontekstissa se on pakollinen. Pakollisuus on käyttötilanteesta riippuva.

**Vaikutus:**

- Kenttäkirjastossa olevat `validointi.pakollinen`-arvot ovat vain oletuksia uutta kenttää lisättäessä — pohja yliajaa ne `kenttamerkinta.pakollinen`-attribuutilla.
- Editori (Vaihe A) hallitsee tämän rastittavalla "Pakollinen" -valinnalla per kenttä per pohja.
- Kun samaa pohjaa kopioidaan asiakas-versioksi (Vaihe A:n loppupuoli tai Vaihe C), pakollisuusasetukset päivitetään näkymäkohtaisesti.

### 2026-04-30 — Etsi vaihtoehtoja ja suosittele -periaate

**Päätös:** AI:n työnkulkuun lisätään: kun toteutusvaihtoehtoja on, esitä 2–3 ja suosittele yksi. Hoitaja valitsee, AI toteuttaa.

**Miksi:** Käyttäjä halusi pysyä ohjaksissa mutta säästää aikaa. Vaihtoehtojen esittely opettaa myös käyttäjää.

### 2026-04-28 — Osiot 1–5 suunniteltu valmiiksi

(Säilyy aiempi sisältö — ks. ROADMAP.md vaihe A:n osio-yksityiskohdat.)

**Tärkeimmät päätökset:**

**Osio 1 — Asiakastiedot:**

- Pakollisten järjestys: nimi → sähköposti → puhelin → syntymäaika
- Avattavat osiot tila-ilmaisimella ("2/5 täytetty")
- Pituus ja paino kokonaislukuna (175, 72)
- Syntymäaika: kirjoita TAI kalenterista
- Puhelin: kansainvälinen tuki

**Osio 2 — Sairaudet ja terveys:**

- 8 ryhmää (aakkostettu ryhmien sisällä)
- "ESTE HOIDOLLE (ole yhteydessä hoitajaan)" omana ryhmänä, amber-värillä
- Tarkennekentät tarpeen mukaan (allergia → mille jne.)
- Vapaat tekstikentät kompakteina, kasvavat kirjoittaessa

**Osio 3 — Hoitoon tulon syy:**

- Apukysymykset näkyvissä kentän alapuolella
- Kipu 0–10 värikoodattuna skaalalla
- Toiveet integroitu apukysymyksiin

**Osio 4 — Asiakkaan kehonkartta:**

- Käytetään olemassa olevaa pohjaa
- Hahmovalinta: nainen/mies pikkukuvilla
- **Hybridi-tallennus:** vapaa piirtäminen + automaattinen vyöhyke-tunnistus
- Tallennus: kuvana + JSON-yhteenvetona

**Osio 5 — Suostumukset:**

- Käytetään olemassa olevaa toteutusta sellaisenaan
- GDPR pakollinen, luovutuslupa valinnainen
- Sormella piirretty allekirjoitus

### 2026-04-28 — Suunnittelukysymykset 1–4 päätetty

(Säilyy aiempi sisältö.)

**Kysymys 1: Tilanhallinta — hybridi**

- **Checkboxit ja valinnat:** autosave (heti tallennus, "✓ tallennettu — Kumoa")
- **Tekstikentät:** manuaalinen tallennus
- **Tallenna-nappi** aina näkyvissä, värittyy muutoksien mukaan
- **Vahinkopainallusten esto:** isot kosketuspinnat (48×48 px), välit (12 px), kumoa-toiminto, pyyhkäisy-minimimatka (80 px)

**Kysymys 2: Tallennus — hoitokerta on lomake-snapshot**

- Asiakkaan tiedot tarkistetaan asiakkaan kanssa **ennen** jokaista hoitoa
- Tallennetaan kyseiseen hoitokertaan
- Lomake on osa hoitokertaa, ei erillinen olio
- Vertailukelpoisuus syntyy automaattisesti

**Kysymys 3: Pakolliset kentät**

- **Aina pakolliset:** Nimi, Syntymäaika, Puhelin, Hoitoon tulon syy
- **Ehdollisesti pakollinen:** Sähköposti (pakollinen kun asiakas täyttää itse, suositeltu kun hoitaja täyttää)
- **Vain uudella asiakkaalla:** Allekirjoitus, Tietosuojan suostumus

**Kysymys 4: Asiakkaan etsiminen**

- "+ Uusi asiakas" -nappi rekisterissä
- "Aloita uusi käynti" rivin oikeassa reunassa olemassa olevalle
- Haku nimellä, sähköpostilla, puhelimella
- Turvaverkko: nimen+syntymäajan haku taustalla, varoittaa duplikaatista

### 2026-04-28 — Identiteetti-malli (Y)

(Säilyy aiempi sisältö.)

### 2026-04-28 — Asiakasportaali käyttää passwordless-kirjautumista

(Säilyy aiempi sisältö.)

### 2026-04-28 — Suunnitelma uudistettu: yksi lomake, ei erillisiä komponentteja

(Säilyy aiempi sisältö. Päätös vahvistettu 30.4.2026 lisäyksellä että asiakkaan lomake ja hoitajan kirjaus yhdistyvät asiakasrekisterissä.)

### 2026-04-28 — Käyttöliittymän tyyli: C-malli

(Säilyy aiempi sisältö.)

### 2026-04-28 — MVP-lähestymistapa

(Säilyy aiempi sisältö.)

### 2026-04-28 — Tietokanta uusittiin puhtaalta pöydältä

(Säilyy aiempi sisältö.)

### 2026-04-28 — Sairauslista tehtiin referenssitauluna

(Säilyy aiempi sisältö.)

### 2026-04-28 — Kontraindikaatio ei punaista bannereita

(Säilyy aiempi sisältö.)

### 2026-04-28 — Kehonkartta: hybridi-tallennus

(Säilyy aiempi sisältö.)

### 29.4.2026 — Lomakepohja-järjestelmä A+B valmis, C käynnissä

(Säilyy aiempi sisältö. Vaihe C jatketaan osana vaihe A:ta uudessa numeroinnissa.)

---

## Hylätyt vaihtoehdot

### Hylätty 30.4.2026: Vanha vaihejärjestys (1→10) hoitajan työkalu ennen asiakaslomaketta

**Aiempi suunnitelma:** Vaihe 1 (asiakastietolomake hoitajan käyttöön) → Vaihe 2 (osiot 6–8) → Vaihe 3 (editori) → Vaihe 4 (sähköinen lomake asiakkaalle) jne.

**Hylätty koska:** Käyttäjä artikuloi visiokeskustelussa että asiakaslomake on tuotteen ydin, ei ensimmäinen vaihe joka tehdään hoitajalle. Asiakkaan polku ohjaa rakennusjärjestystä.

**Korvaava ratkaisu:** Vaiheet A–G uudessa järjestyksessä, Vaihe 1 ja 4 yhdistetty Vaihe A:ksi.

### Hylätty 30.4.2026: "Mobiili ensin" -yleisperiaate

**Aiempi periaate:** Sovelluksen pitää toimia puhelimella ennen kuin desktopilla.

**Hylätty koska:** Hoitaja työskentelee oikeasti PC:llä (lomake-editori, asetukset, raportit). Mobile-first hoitajan UI:ssa on huono valinta. Erikseen asiakkaan UI on aidosti mobile-first.

**Korvaava ratkaisu:** Hoitaja PC-first, asiakas mobile-first, tabletti tukee molempia.

### Hylätty 30.4.2026: Palvelu-linkitys (3 B+) lykättynä myöhemmäksi

**Aiempi suunnitelma:** "Avoinna kunnes editori toimii."

**Hylätty koska:** Tuotenäkemyksessä lomake + palvelu pari on koko sovelluksen ydin. Ilman palvelukohtaisia lomakkeita ei voi olla mielekästä asiakaspolkua.

**Korvaava ratkaisu:** B+ palvelu-linkitys nostettu ydintehtäväksi vaiheessa A.

### Hylätty 30.4.2026: Multi-tenant vasta vaiheessa 10

**Aiempi suunnitelma:** Multi-tenant on viimeinen vaihe, ennen sitä rakennetaan vain yhdelle hoitajalle.

**Hylätty koska:** Joudutaan purkamaan paljon päätöksiä myöhemmin. Periaatetasolla multi-tenant pitää huomioida alusta asti vaikka toiminnallisuus rakennetaan yhdelle.

**Korvaava ratkaisu:** "Build for one, design for many" -periaate. Vaihe G (toteutus) jää loppuun, mutta arkkitehtuuri tukee jo nyt.

### Hylätty 30.4.2026: Paperilomakkeen säilyttäminen rinnakkain sähköisen kanssa

**Aiempi ajatus:** Sähköisen lomakkeen valmistuttua paperi jää käyttöön sellaisille jotka eivät täytä etukäteen.

**Hylätty koska:** Päällekkäisyys aiheuttaa sekaannusta ja kahdet tiedot. Hoitohuoneessa tabletti riittää paikan päällä täyttämiseen.

**Korvaava ratkaisu:** Sähköinen kaikkialla, paperi vain hätävarana nettiongelmaan. Offline-toiminnallisuus (Vaihe B) auttaa myös hätätilanteissa.

### Hylätty: AsiakasKortti-komponentti (omana näkymänä)

(Säilyy aiempi sisältö.)

### Hylätty: Erilliset välilehdet (Havainnot, Kehokartta jne.)

(Säilyy aiempi sisältö.)

### Hylätty: Erillinen lomakkeen versiointi (versio per päivä tms.)

(Säilyy aiempi sisältö.)

### Hylätty: Salasanan käyttö asiakasportaalissa

(Säilyy aiempi sisältö.)

### Hylätty: Pelkkä kuvana tallennettava kehonkartta

(Säilyy aiempi sisältö.)

### Hylätty: Pelkät vyöhykkeet kehonkartassa

(Säilyy aiempi sisältö.)

### Hylätty: Hakukenttä sairauslistan yläosassa

(Säilyy aiempi sisältö.)

### Hylätty: Sairaudet jsonb-kenttänä

(Säilyy aiempi sisältö.)

### Hylätty: Erillinen `kontraindikaatiot`-kenttä

(Säilyy aiempi sisältö.)

### Hylätty: Asentohavainnot ja rakenteelliset eri tauluihin

(Säilyy aiempi sisältö.)

### Hylätty: Iso "kontraindikaatio-banneri" punaisella

(Säilyy aiempi sisältö.)

### Hylätty: ClientForm `readOnly`-tilassa

(Säilyy aiempi sisältö.)

### Hylätty: Hahmovalinta osiossa 1 (sukupuoli pakollisena)

(Säilyy aiempi sisältö.)

---

## Avoimet kysymykset

Nämä on tunnistettu mutta ei vielä päätetty:

- **Vanhat paperilomakkeet:** skannataan kaikki vai aloitetaanko digitaalisesti puhtaalta pöydältä?
- **Domain (vaihe D):** kalevalapaja.fi pidetään, kalevalapaja.fi käytetään uudelle, vai uusi domain (esim. kehokorjaamo.fi)?
- **Maksut (vaihe F):** varauksen yhteydessä, hoidon jälkeen, vai molemmat vaihtoehdot?
- **Hoitajan kehonkartta** osio 6: pidetään olemassa oleva BodyMap.jsx vai muutetaan
- **Multi-tenant arkkitehtuuri:** miten skaalataan kun muutkin hoitajat alkavat käyttää (vaihe G)
- **Sähköposti-ilmoitukset:** Edge functions Supabasessa vai ulkopuolinen palvelu
- **Sähköpostimuistutusten automatisointi:** nykyinen viikon päästä lähtevä muistutus → milloin automatisoidaan
- **Tietosuojaseloste:** vaiheessa D luodaan virallinen, alkuun voi olla väliaikainen linkki

---

## Tulevia ideoita ja päätöksiä

### Vanhojen paperilomakkeiden skannaus → digitointi

**Idea:** Mahdollisuus skannata vanhoja paperisia asiakastietolomakkeita ja siirtää tiedot asiakasrekisteriin.

**Toteutus:** Kuva → AI-tunnistus → kentät esitäytetään → hoitaja tarkistaa ja vahvistaa.

**Lisätään:** Vaiheeseen A (perusrekisteri) tai B (kun rekisteri on toiminnassa).

### Offline-pääsy hoitokirjauksiin

**Idea:** Hoitohuoneessa pitää voida kirjata jos verkkoyhteys ei toimi.

**Toteutus:** Paikallinen tallennus selaimeen (IndexedDB tai vastaava), synkronointi serverille kun yhteys palaa.

**Lisätään:** Vaiheeseen B.

### Automaattinen ROADMAP/PROJEKTIMUISTI -versionhallinta

**Idea:** Aina kun keskustelussa tehdään iso päätös, Claude tarjoutuu automaattisesti päivittämään ROADMAP.md ja PROJEKTIMUISTI.md ja työntämään muutokset GitHubiin.

**Toteutus:** Tämä on osa työnkulkua, ei sovelluksen ominaisuus. Ohjeistus tehdään PROJEKTIMUISTI:in.

### Automaattinen laadunvarmistus

**Idea:** Yhden napin täysi automaatio Asetuksissa.

**Toiminta:**

- Käyttäjä klikkaa "Tarkista" -nappia
- Sovellus lähettää koko koodin + ROADMAP + PROJEKTIMUISTI Anthropic API:lle
- Claude analysoi: koodin puhtaus, eheys, toimivuus, käyttäjäpolut, bugit, parannusehdotukset, uudet ideat
- Vastaus listataan selkokielellä kategorioittain:
  - 🔴 Bugit
  - 🟠 Tekninen velka
  - 🟡 Käytettävyys
  - 🟢 Uudet ideat
  - 🔵 Suorituskyky
- Käyttäjä valitsee valintaruudukoilla mitkä siirretään To-Do:lle

**Miksi ei tehdä nyt:**

- Vaatii Anthropic API -avaimen ja maksaa per kutsu (~0.05–0.50 € / tarkistus)
- Koodikanta on vasta kasvamassa
- Iso työ joka viivyttäisi vaihetta A

**Miksi myöhemmin ok:** Vaiheessa G tai sen jälkeen, kun koodikanta on isompi ja sovellus tuottaa.

### AI-tuki hoidon aikana

**Idea:** AI ehdottaa hoitosuunnitelmaa havaintojen perusteella, hoitaja hyväksyy.

**Lisätään:** Toteutuu osittain vaiheessa B (mittausautomatiikka). Täysi AI-tuki erillisenä projektina vaiheen G yhteydessä.

### Tuotehallinnan oikea käyttötarkoitus

**Periaate:** Tuotehallintaan EI duplikoida ROADMAP:ista mitä jo on.

- `ROADMAP.md` = Suunnitelma (vaiheet A–G, päätökset)
- `Tuotehallinta` = Mitä **ilmenee** rakentamisen aikana

**Tuotehallintaan kirjataan:**

- 🐛 Bugit jotka löydetään
- 💡 Uudet ideat jotka tulevat mieleen
- 🔧 Tekninen velka
- 📝 Pienet parannukset
- ⏰ Asioita "myöhemmäksi"
- ❓ Avoimia kysymyksiä jotka tarvitsevat ratkaisua

---

## Käyttäjän asetukset (Oxa)

- Hoitajatili: `oxainn@gmail.com`
- Yhteysosoite asiakkaita varten: `jari@kalevalapaja.fi`
- Sijainti: Espoo
- Hoitohuone: kotihoitohuone (ti–to 16:30–21:00)
- Toiminimet: Oxain, Kalevalapaja
- Avopuoliso: Soile Nieminen
- Tasoltaan aloittelija AI:n ja koodauksen kanssa
- Suomenkieliset vastaukset, rento sävy
- **Aikabudjetti:** 10–20 h/viikko
- **Käyttölaitteet:**
  - Hoitaja: PC ensisijaisesti, tabletti hoitohuoneessa, puhelin tukena
  - Asiakas: puhelin ensisijaisesti, PC tuettu
- **Tärkein periaate:** *"Onko tämä helppo Oxalle kiireisenä päivänä?"*

---

## Käytetyt periaatteet kun työskennellään Coden kanssa

1. Claude Chat suunnittelee, Claude Code toteuttaa
2. Suunnitelma → tarkistus → koodi → tarkistus → push
3. Pieni pala kerrallaan, ei isoja "tee kaikki" -pyyntöjä
4. Aina `npm run build` ennen pushia
5. Suomenkieliset muuttujanimet kaikkialla
6. Null-suoja kaikkialla missä luetaan tietokantaa
7. Tarkista että nykyiset toiminnot eivät rikkoudu
8. Suunnitellaan ensin koko visio loppuun, vasta sitten koodataan (oppi 28.4.2026)
9. Hyödynnetään olemassa olevaa — älä rakenna uudelleen mitä toimii
10. **Etsi vaihtoehtoja ja suosittele** — esitä 2–3 toteutusvaihtoehtoa kun tilanne sen sallii (uusi 30.4.2026)
11. **Päivitä ROADMAP/PROJEKTIMUISTI** kun teet ison päätöksen — tarjoudu automaattisesti tekemään päivitys ja työntämään GitHubiin (uusi 30.4.2026)

---

## Linkkejä

- **Sovellus:** https://kehokorjaamo-app.vercel.app/
- **GitHub:** https://github.com/oxainn/Kehokorjaamo-App
- **Supabase:** https://supabase.com/dashboard/project/uwysictfbzswecnxvmif
- **Nykyinen kotisivu:** https://kalevalapaja.fi/
- **Vello (ajanvaraus):** korvataan vaiheessa E
