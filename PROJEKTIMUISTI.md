# Kehokorjaamo App — Projektimuisti

> **Tarkoitus:** Tämä tiedosto kerää tehdyt päätökset, periaatteet ja hylätyt vaihtoehdot.
> Roadmap kertoo mitä tehdään, projektimuisti kertoo miksi.
> Päivitä kun teet ison päätöksen.

**Viimeisin päivitys:** 2026-04-29

---

## Käytössä olevat työkalut

- **Frontend:** React + Vite + Tailwind
- **Hosting:** Vercel (kehokorjaamo-app.vercel.app)
- **Database + Auth:** Supabase (PKCE-flow, projekti-ID `uwysictfbzswecnxvmif`)
- **Versionhallinta:** GitHub (`oxainn/Kehokorjaamo-App`)
- **AI-koodaus:** Claude Code + Claude Chat (Claude Max -tilaus)
- **Domain (nykyinen):** kehokorjaamo-app.vercel.app
- **Domain (tuleva):** päätetään vaiheessa 6, ks. Roadmap
- **Ajanvaraus (nykyinen):** Vello, korvataan vaiheessa 7
- **Sähköpostimuistutukset:** käsin lähetetty viikon päästä hoidosta (säilytetään, automatisoidaan myöhemmin)

---

## Olemassa olevat komponentit (säilytetään tai parannetaan)

| Komponentti | Tila | Toimenpide vaiheessa 1 |
|-------------|------|------------------------|
| Kehonkartta (`ClientForm.jsx`) | ✅ Toimii | Parannus: vapaa piirtäminen + automaattinen vyöhyke-tunnistus |
| Kehon vyöhykkeet (`kehonVyohykkeet.js`) | ✅ Toimii | Pidetään (35 vyöhykettä) |
| Suostumukset-osa (allekirjoitus + GDPR) | ✅ Toimii | Käytetään sellaisenaan |
| `useAsiakkaanSairaudet`-hook | ✅ Toimii | Käytetään uudessa lomakkeessa |
| `normalisoiAsiakas`-funktio | ✅ Päivitetty | Käytetään |
| Tietokanta (14 taulua) | ✅ Valmis | Pieni viilaus tarvittaessa |

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

### Versiointi-logiikka — uusi periaate (28.4.2026)

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

### 2026-04-28 — Osiot 1–5 suunniteltu valmiiksi

**Kaikkien viiden osion käyttöliittymä-yksityiskohdat päätetty.** Yksityiskohdat ROADMAP.md:ssä "Osiokohtaiset suunnittelupäätökset" -osiossa.

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

**Päätös:** Asiakkaalla pysyvä UUID, kaikki muu voi muuttua. Asiakkaalla "nykyiset tiedot", hoitokerralla "silloinen snapshot".

**Miksi:** Käyttäjä huomautti että nimikin voi muuttua (esim. avioliiton mukana). Sisäinen ID pysyy asiakkaan koko elämän ajan. Pieni duplikointi (asiakas + hoitokerta) on hyväksyttävää selkeyden vuoksi.

### 2026-04-28 — Asiakasportaali käyttää passwordless-kirjautumista

**Päätös:** Asiakas kirjautuu portaaliin sähköpostilinkillä, ei salasanalla.

**Miksi:**
- Yksinkertaista käyttäjälle (ei salasanoja muistettavaksi)
- Turvallista (sähköpostilinkki yksittäiskäyttöön)
- Toimii pitkän tauon jälkeen automaattisesti
- Ratkaisee "unohdin salasanan" -ongelman

**Vaikutus:** Sähköposti pakollinen kun asiakas täyttää itse lomakkeen.

### 2026-04-28 — Lomakkeen lähetyksen jälkeen portaalin esittely

**Päätös:** Vellon nykyinen "Kiitos ajanvarauksesta"-popup korvataan käyttökelpoisemmalla viestillä joka esittelee asiakasportaalin.

**Miksi:** Nykyinen popup on turha — vain "OK"-nappi joka pitää klikata pois. Asiakas on motivoitunut juuri lomakkeen lähetyksen jälkeen — tämä on paras hetki esitellä portaali.

**Vaikutus:** Vaiheessa 5 (asiakasportaali) tämä toteutetaan.

### 2026-04-28 — Suunnitelma uudistettu: yksi lomake, ei erillisiä komponentteja

**Päätös:** Asiakastietolomake on **yksi** lomake joka kasvaa hoitoketjun aikana. Ei AsiakasKortti-komponenttia, ei välilehtiä.

**Miksi:** Käyttäjä ilmaisi vision selkeästi: *"Mielellään yksi muunneltava lomake koko ketjun ajan."* Erilliset välilehdet rikkovat kokonaisuuden.

**Vaikutus:**
- AsiakasKortti.jsx **poistetaan**
- Vanhat välilehdet (Havainnot, Kehokartta, Kuva-analyysi, Hoitosuunnitelma, Lihakset, Jälkihoito) **poistetaan**
- Tilalle: yksi `Asiakastietolomake.jsx` jossa 8 osiota
- Käyttöliittymä: C-tyyli (osio kerrallaan, navigointi pyyhkäisyllä + nuolinapeilla)

### 2026-04-28 — Käyttöliittymän tyyli: C-malli

**Päätös:** Yksi osio kerrallaan näkyvissä, navigointi:
- Pyyhkäisy vasemmalle/oikealle (mobiili, tabletti)
- Nuolinapit ◄ EDELLINEN | SEURAAVA ► (kaikki laitteet)
- Pisteet/numerot ylhäällä — klikkaa hyppää suoraan osioon

**Miksi:** Käyttäjä piirsi luonnoksen jossa tämä rakenne. Selkeä, ei sekoita, toimii sekä tabletilla että puhelimella samalla tavalla.

**Visuaaliset ilmaisimet:**
- ● = osio täytetty
- ◉ = nykyinen osio
- ○ = tyhjä, ei vielä täytetty

### 2026-04-28 — MVP-lähestymistapa

**Päätös:** Toimiva paketti ensin, kehitys käytön myötä. Ei yritetä rakentaa täydellistä versiota kerralla.

**Miksi:** Käyttäjä sanoi: *"Saadaan paketti toimimaan, sitten kehitetään käyttökokemuksen myötä."*

**Vaikutus:**
- Vaihe 1: vain osiot 1–5 (asiakkaan osa)
- Vaihe 2: osiot 6–8 (hoitajan osa) lisätään myöhemmin
- Pakolliset kentät minimoidaan
- Muut osiot voi jättää tyhjiksi alkuun

### 2026-04-28 — Tietokanta uusittiin puhtaalta pöydältä

**Päätös:** Vanhat taulut (`hoitokaynit`, `esitiedot`, `uudet_asiakkaat`) tiputettiin, testidata pyyhittiin.

**Miksi:** Vanha rakenne oli pelkkä jsonb-pussi → ei vertailukelpoisuutta. Testidataa vain 3+8 riviä, ei menetystä.

**Tilalle:** 14 taulua + 3 näkymää, RLS aina päällä, automaattinen versiointi.

### 2026-04-28 — Sairauslista tehtiin referenssitauluna

**Päätös:** Sairaudet eivät ole jsonb-kentässä eikä boolean-sarakkeina, vaan omassa `sairaus_tyypit`-taulussa.

**Miksi:** Hoitaja voi lisätä uusia sairauksia ilman koodimuutosta. Tukee laajaa käyttäjäkuntaa.

### 2026-04-28 — Kontraindikaatio ei punaista bannereita

**Päätös:** Kontraindikaatio-varoitusta ei korosteta isolla bannerilla.

**Miksi:** Käytännössä kontraindikaatio käy ilmi hoidon kuvauksessa muutenkin. Liika varoittelu turruttaa.

### 2026-04-28 — Kehonkartta: hybridi-tallennus

**Päätös:** Asiakas piirtää sormella vapaasti, tallennetaan sekä kuvana että automaattisena vyöhyke-yhteenvetona.

**Miksi:**
- Käyttäjä halusi alkuun "vain visuaalista tietoa" — kuvavertailu silmäilemällä
- Mutta tulevassa vaiheessa 9 (AI-tuki) tarvitaan rakenteellista dataa
- Hybridi täyttää molemmat tarpeet — asiakas piirtää intuitiivisesti, ohjelma analysoi taustalla
- Olemassa olevat 35 vyöhykettä toimivat pohjana automaattiselle tunnistukselle
- Visuaalinen kuva mahdollistaa täysin vapaan piirtämisen ilman vyöhyke-rajoituksia

**Vaikutus:** Code parantaa olemassa olevaa kehonkartta-komponenttia tukemaan vapaata piirtämistä.

### 2026-04-28 — Yksi lomake, palveluvalinta osana lomaketta

**Päätös:** Asiakastietolomake on yksi sähköinen lomake, jossa palveluvalinta on osio 3:n alussa.

### 2026-04-28 — Custom hook `useAsiakkaanSairaudet`

**Päätös:** Sairauksien haku tehdään custom hookilla, ei App.jsx:n staten kautta.

**Miksi:** App.jsx pysyy kevyenä. Yhden vastuun periaate.

**Sijainti:** `src/hooks/useAsiakkaanSairaudet.js`.

### 29.4.2026 — Lomakepohja-järjestelmä A+B valmis, C käynnissä

**Asetukset → Käyttäjähallinta uudelleenjärjestely (✅ valmis):**
- Terapeutin tiedot
- Asiakastietolomakkeet (uusi)
- Palvelut (siirretty)

**Vaihe A: Tietokanta (✅ valmis):**
- lomakepohjat-, lomakepohja_versiot-, kenttakirjasto-,
  kentan_versiot-taulut
- Migraatio ajettu Supabasessa
- 3 valmista pohjaa, 22 kenttää, FI+EN-käännökset

**Vaihe B: Lomakekirjasto (✅ valmis):**
- LomakeKirjasto.jsx-komponentti
- RLS-bug korjattu (hoitaja_id puuttui INSERTistä)
- ⋯-valikko-bug korjattu (mousedown + useRef -patterni,
  React 17+ event delegation -ongelma)
- Pikkuasiat kesken: ⋯-koko liian pieni, accessibility-varoituksia

**Vaihe C: Editori (🟡 käynnissä):**
- Oma näkymä, ei modaali (URL `/asetukset/lomakepohja/<id>`)
- Kaksipalstainen layout (tietokone-optimoitu)
- Master-detail valittu pois — jokainen muokkausvaihe näkyvissä yhtä aikaa

**Periaate-päätökset (TÄRKEÄT):**

1. **Hoitaja vs asiakas — selkeä vastuujako:**
   - Hoitaja luo, muokkaa ja hallinnoi lomakepohjia
   - Asiakas täyttää valmiita lomakkeita
   - Asiakkaan kielivalinta lomakkeessa siirretty vaiheeseen 4

2. **Lomakkeet tehdään tietokoneella:**
   - Editori suunniteltu tietokoneen näytölle
   - Mobiilioptimointi vasta jos siihen tulee tarve
   - Asiakkaan lomakkeen täyttö (vaihe 4) on eri juttu — siellä
     mobiili-toimivuus on välttämätöntä

3. **Vaihe B+ (palvelu-linkitys) lykätty:**
   - Päätös: keskitytään ensin saamaan editori toimimaan
   - Linkitys ei ole esteenä editorin rakentamiselle
   - Palautetaan agendalle kun editori on käytettävissä

**Hylätyt vaihtoehdot:**
- Editori modaalina — liian ahdas isolle työkalulle,
  mobiilissa erityisen tukala
- Master-detail-näkymät tietokoneella — turhia sivunvaihtoja kun
  ruutua on
- Tapa B (relaatiomalli) tietokannassa — JSON joustavampi
- Asiakas tekee/muokkaa lomakkeita — ei kuulu asiakkaan vastuulle

**Avoinna:**
- Vaihe C: editori toteutus (suunnitelma valmis)
- ⋯-koko isommaksi (vähäinen, tehdään myöhemmin)
- Accessibility-varoitukset (muutamia, tehdään myöhemmin)
- Vaihe B+ palvelu-linkitys (myöhemmin)

---

## Hylätyt vaihtoehdot

### Hylätty: AsiakasKortti-komponentti (omana näkymänä)

**Ehdotus:** Erillinen "kortti"-komponentti read-only katseluun, ClientForm muokkaukseen.

**Hylätty koska:** Käyttäjä halusi yhtä lomaketta, ei kahta erillistä komponenttia.

**Korvaava ratkaisu:** Yksi `Asiakastietolomake`-komponentti.

### Hylätty: Erilliset välilehdet (Havainnot, Kehokartta jne.)

**Ehdotus:** Käyntinäkymässä monta välilehteä eri toiminnoille.

**Hylätty koska:** Käyttäjä: *"Erilliset välilehdet mielestäni rikkoo kokonaisuuden."*

**Korvaava ratkaisu:** Kaikki entiset "välilehdet" ovat osioita yhdessä lomakkeessa (osiot 6–8).

### Hylätty: Erillinen lomakkeen versiointi (versio per päivä tms.)

**Ehdotus:** Tallennetaan uusi lomakeversio aikaperusteisesti.

**Hylätty koska:** Käyttäjä ehdotti paremman mallin: hoitokerta = lomake-snapshot.

### Hylätty: Salasanan käyttö asiakasportaalissa

**Ehdotus:** Klassinen sähköposti + salasana -kirjautuminen.

**Hylätty koska:** Salasanat unohtuvat etenkin pitkän tauon jälkeen. Passwordless-kirjautuminen on yksinkertaisempi ja turvallisempi.

### Hylätty: Pelkkä kuvana tallennettava kehonkartta

**Ehdotus:** Asiakkaan kehonkartta tallennetaan vain PNG-kuvana.

**Hylätty koska:** Vaikka käyttäjä alkuun halusi pelkkää visuaalista tietoa, hybridi-ratkaisu (kuva + JSON) tukee paremmin tulevia vaiheita kuten AI-analyysiä (vaihe 9). Sama käyttäjäkokemus säilyy.

### Hylätty: Pelkät vyöhykkeet kehonkartassa

**Ehdotus:** Asiakas napsuttaa ennalta määriteltyjä vyöhykkeitä (Coden olemassa oleva versio).

**Hylätty koska:** Käyttäjä huomautti että rajoitettu vaihtoehto turhauttaa jos sopivaa pistettä ei löydy. Vapaa piirtäminen on intuitiivisempi.

### Hylätty: Hakukenttä sairauslistan yläosassa

**Ehdotus:** Etsi-kenttä yläosassa nopeaan löytämiseen.

**Hylätty koska:** 24 sairautta on hallittavissa silmäilyllä. Lisätään myöhemmin jos lista kasvaa.

### Hylätty: Sairaudet jsonb-kenttänä

**Ehdotus:** `asiakastietolomake_versiot.sairaudet` yksi jsonb-objekti.

**Hylätty koska:** Ei muokattavissa hoitajan toimesta, ei skaalaudu uusille käyttäjille.

### Hylätty: Erillinen `kontraindikaatiot`-kenttä

**Ehdotus:** Tallennetaan kontraindikaatiot omaan kenttään.

**Hylätty koska:** Kontraindikaatio johdetaan suoraan `sairaus_tyypit.kontraindikaatio = true` -kentästä.

### Hylätty: Asentohavainnot ja rakenteelliset eri tauluihin

**Ehdotus:** Erilliset taulut sivun 1 ja sivun 2 havainnoille.

**Hylätty koska:** Yhdistetään `havainnot`-tauluun `tyyppi`-kentällä.

### Hylätty: Iso "kontraindikaatio-banneri" punaisella

**Ehdotus:** AsiakasKortin yläosaan iso varoitus.

**Hylätty koska:** Hoitaja näkee kontraindikaatiot muutenkin sairauslistasta.

### Hylätty: ClientForm `readOnly`-tilassa

**Ehdotus:** Käytetään samaa lomaketta sekä katseluun että muokkaukseen.

**Hylätty koska:** Korvautui paremmalla ratkaisulla (yksi Asiakastietolomake selkeällä osio-rakenteella).

### Hylätty: Hahmovalinta osiossa 1 (sukupuoli pakollisena)

**Ehdotus:** Sukupuoli kerätään osana henkilötietoja, käytetään automaattisesti kehonkartassa.

**Hylätty koska:** Sukupuoli on arkaluonteinen tieto. GDPR-syistä parempi kerätä vain tarpeellinen. Hahmovalinta tehdään suoraan kehonkartassa.

---

## Avoimet kysymykset

Nämä on tunnistettu mutta ei vielä päätetty:

- **Domain:** vaiheessa 6 (kalevalapaja.fi vs app.kalevalapaja.fi vs muu)
- **Hoitajan kehonkartta** osio 6: pidetään olemassa oleva BodyMap.jsx (hoitajan löydökset) vai muutetaan
- **Multi-tenant arkkitehtuuri:** miten skaalataan kun muutkin hoitajat alkavat käyttää (vaihe 10)
- **Maksaminen:** Stripe-integraatio osana ajanvarausta vai erillinen vaihe
- **Sähköposti-ilmoitukset:** Edge functions Supabasessa vai ulkopuolinen palvelu
- **Sähköpostimuistutusten automatisointi:** nykyinen viikon päästä lähtevä muistutus → milloin automatisoidaan
- **Tietosuojaseloste:** vaiheessa 6 luodaan virallinen, vaiheessa 1 voi olla väliaikainen linkki

---

## Tulevia ideoita ja päätöksiä

### Automaattinen laadunvarmistus (vaihe 8 tai myöhemmin)

**Idea:** Yhden napin täysi automaatio Asetuksissa.

**Toiminta:**
- Käyttäjä klikkaa "Tarkista" -nappia
- Sovellus lähettää koko koodin + ROADMAP + PROJEKTIMUISTI Anthropic API:lle
- Claude analysoi: koodin puhtaus, eheys, toimivuus, käyttäjäpolut, bugit, parannusehdotukset, uudet ideat
- Vastaus listataan selkokielellä kategorioittain:
  - 🔴 Bugit (jokin ei toimi)
  - 🟠 Tekninen velka (sotkuinen koodi)
  - 🟡 Käytettävyys (mobiili, validointi, palaute)
  - 🟢 Uudet ideat
  - 🔵 Suorituskyky
- Käyttäjä valitsee valintaruudukoilla mitkä ehdotukset siirretään To-Do:lle
- "Siirrä To-Do:lle" → tehtävät lisätään Tuotehallintaan valmiilla promptilla Codelle

**Miksi ei tehdä nyt:**
- Vaatii Anthropic API -avaimen ja maksaa per kutsu (~0.05–0.50 € / tarkistus)
- Ohjelma ei vielä tuota → ei haluta lisämaksuja
- Koodikanta on vasta kasvamassa → vähän tarkistettavaa
- Iso työ (1–2 viikkoa) joka viivyttäisi vaihetta 1

**Miksi myöhemmin ok:**
- Vaiheessa 8 (tai aiemmin kun vaihe 2 valmis)
- Koodikanta isompi → hyöty kasvaa
- Ohjelma tuottaa → API-kulut hyväksyttäviä
- Iso aikasäästö myöhemmin testauksessa

**Prioriteetti:** Korkea — kun aika tulee, rakennetaan kunnolla ja kaiken kattavana.

---

### Tuotehallinnan oikea käyttötarkoitus

**Periaate:** Tuotehallintaan EI duplikoida ROADMAP:ista mitä jo on.

- `ROADMAP.md` = Suunnitelma (vaiheet 1–10, päätökset)
- `Tuotehallinta` = Mitä **ilmenee** rakentamisen aikana

**Tuotehallintaan kirjataan:**
- 🐛 Bugit jotka löydetään
- 💡 Uudet ideat jotka tulevat mieleen
- 🔧 Tekninen velka
- 📝 Pienet parannukset
- ⏰ Asioita "myöhemmäksi"
- ❓ Avoimia kysymyksiä jotka tarvitsevat ratkaisua

Eli: asioita joita **ei ole ROADMAP:issa**, tai jotka tarkentavat ROADMAP:in vaiheita. Tuotehallinta täyttyy luonnollisesti kehityksen aikana — ei tarvitse alustaa väkisin.

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
8. **Suunnitellaan ensin koko visio loppuun, vasta sitten koodataan** (oppi 28.4.2026)
9. **Hyödynnetään olemassa olevaa** — älä rakenna uudelleen mitä toimii (kehonkartta, suostumukset)

---

## Linkkejä

- **Sovellus:** https://kehokorjaamo-app.vercel.app/
- **GitHub:** https://github.com/oxainn/Kehokorjaamo-App
- **Supabase:** https://supabase.com/dashboard/project/uwysictfbzswecnxvmif
- **Nykyinen kotisivu:** https://kalevalapaja.fi/
- **Vello (ajanvaraus):** korvataan vaiheessa 7
