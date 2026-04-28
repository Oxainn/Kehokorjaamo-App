# Kehokorjaamo App — Roadmap

> **Tarkoitus:** Tämä tiedosto kertoo missä mennään ja minne ollaan menossa.
> Päivitä aina kun vaihe valmistuu tai suunnitelma muuttuu.
> Kun aloitat uuden Claude-chatin, voit sanoa: *"Lue ROADMAP.md ja jatka vaiheesta X"*.

**Viimeisin päivitys:** 2026-04-28 (suunnittelukysymykset 1–4 päätetty)

---

## Vaiheet ja status

| # | Vaihe | Status | Huom |
|---|-------|--------|------|
| 1 | Asiakastietolomake — osiot 1–5 (asiakkaan osa) | 🟡 Suunnittelu valmis | Konkreettinen osio-suunnittelu seuraavaksi |
| 2 | Asiakastietolomake — osiot 6–8 (hoitajan osa) | ⚪ Odottaa | Lisätään kun osiot 1–5 toimivat |
| 3 | Palvelut + hoitajaprofiili Asetuksiin | ⚪ Odottaa | Pohja sivustolle ja lomakkeelle |
| 4 | Sähköinen lomake asiakkaalle (osiot 1–5) | ⚪ Odottaa | Asiakas täyttää itse, URL `/varaa` |
| 5 | Asiakasportaali (passwordless-kirjautuminen) | ⚪ Odottaa | Tietokanta jo valmis (RLS) |
| 6 | Julkinen sivusto | ⚪ Odottaa | Korvaa kalevalapaja.fi WordPress |
| 7 | Ajanvaraus | ⚪ Odottaa | Korvaa Vellon |
| 8 | Itsehoito-ohjeet portaaliin | ⚪ Odottaa | Synkronoituu lomakkeen havainnoista |
| 9 | AI-tuki hoidon aikana | ⚪ Odottaa | Ehdotukset hoitosuunnitelmaan |
| 10 | Tilastot, raportit, multi-hoitaja | ⚪ Odottaa | Skaalaus muille hoitajille |

**Status-merkit:** 🟢 Valmis · 🟡 Käynnissä · ⚪ Odottaa · 🔴 Jumissa

---

## Lomakkeen 8 osiota — koko rakenne

Asiakastietolomake on **yksi pitkä lomake** joka kasvaa hoitoketjun aikana. Käyttöliittymässä se näytetään **osio kerrallaan** (C-tyyli), navigointi pyyhkäisyllä tai nuolinapeilla.

### Asiakkaan osa (osiot 1–5) — vaihe 1

| # | Osio | Sisältö | Pakolliset |
|---|------|---------|------------|
| 1 | **Asiakastiedot** | Nimi, syntymäaika, yhteystiedot, osoite, ammatti, pituus/paino | Nimi, syntymäaika, puhelin |
| 2 | **Sairaudet ja terveys** | Sairauslista (24 kpl checkboxia), lääkitys, allergiat, vammat | — |
| 3 | **Hoitoon tulon syy** | Vapaa tekstikenttä, kipuaste 0–10, toiveet hoidolta | Hoitoon tulon syy |
| 4 | **Asiakkaan kehonkartta** | Kuvat (etu/sivu/taka) joihin asiakas merkitsee oireet sormella | — |
| 5 | **Suostumukset** | Tietosuojaseloste, GDPR, allekirjoitus | Allekirjoitus, tietosuoja (vain uusilla) |

**Sähköposti:**
- Pakollinen kun asiakas täyttää itse (vaihe 4) — tarvitaan portaalin kirjautumistunnuksiin
- Suositeltu mutta ei pakollinen kun hoitaja täyttää (esim. iäkäs asiakas)

### Hoitajan osa (osiot 6–8) — vaihe 2

| # | Osio | Sisältö |
|---|------|---------|
| 6 | **Havainnot ja löydökset** | Asentohavainnot (kallistus, kierto jne.) + 10 anatomista aluetta |
| 7 | **Kuvantamiset** | Puhelimella otetut kuvat + niihin merkityt pisteet ja lasketut kulmat |
| 8 | **Hoitoraportti** | Lähtötilanne, hoidon kulku, muista ensi kerralla — kasvaa käynti kerralta |

---

## Käyttöliittymän periaatteet

**Navigointi osioiden välillä:**
- Pyyhkäisy vasemmalle / oikealle (mobiili, tabletti) — minimimatka esim. 80 px
- Nuolinapit ◄ EDELLINEN | SEURAAVA ► (kaikki laitteet)
- Pisteet/numerot ylhäällä — klikkaa hyppää suoraan osioon

**Visuaaliset ilmaisimet:**
- ● = osio täytetty (vihreä)
- ◉ = nykyinen osio
- ○ = tyhjä, ei vielä täytetty (harmaa)
- ⭐ = pakollinen kenttä merkittynä punaisella tähdellä
- ✓ = kenttä täytetty oikein (vihreä)
- ⚠ = pakollinen kenttä puuttuu

**Tilannekohtaiset elementit:**
- Tallenna-nappi aina näkyvissä
  - Harmaa = ei muutoksia
  - Vihreä + lukumäärä = "Tallenna 3 muutosta"
- Esikatselu mahdollinen (näyttää koko lomakkeen kerralla)
- Tulostus (sama paperilomake kuin nyt)

**Vahinkopainallusten esto puhelimessa:**
- Kosketuspinnat vähintään 48×48 px
- Pystysuora väli checkboxien välissä vähintään 12 px
- Kumoa-toiminto autosave-tapahtumille (5 sek)
- Pyyhkäisy vaatii vähintään 80 px liikkeen
- Tärkeät napit erotettuna (Tallenna iso vihreä, Hylkää pieni harmaa)

---

## Hyväksytyt suunnittelupäätökset (vaihe 1)

### Tilanhallinta — hybridi
- **Checkboxit ja valinnat:** autosave (heti tallennus, "✓ tallennettu — Kumoa")
- **Tekstikentät:** manuaalinen tallennus
- **Tallenna-nappi** aina näkyvissä, värittyy muutoksien mukaan

### Tallennus — lomake on osa hoitokertaa
- Asiakkaan tiedot tarkastetaan asiakkaan kanssa **ennen** jokaista hoitoa
- Tallennetaan **kyseiseen hoitokertaan** (snapshot)
- Hoitokerrat näyttävät silloiset tiedot
- Vertailukelpoisuus syntyy automaattisesti (yksi hoitokerta = yksi snapshot)

### Pakolliset kentät
**Aina pakolliset:**
- Nimi, Syntymäaika, Puhelin, Hoitoon tulon syy

**Ehdollisesti pakollinen:**
- Sähköposti (pakollinen kun asiakas täyttää itse, suositeltu kun hoitaja täyttää)

**Vain uudella asiakkaalla (ensimmäinen lomake):**
- Allekirjoitus, Tietosuojan suostumus

### Asiakkaan etsiminen
**Asiakasrekisterissä kaksi nappia:**
- "+ Uusi asiakas" — luo täysin uusi
- "Aloita uusi käynti" rivin oikeassa reunassa — olemassa olevalle

**Haku:** nimellä, sähköpostilla, puhelimella

**Turvaverkko:** kun täytät uuden asiakkaan nimeä + syntymäaikaa, ohjelma etsii taustalla — varoittaa jos löytyy mahdollinen duplikaatti

### Identiteetti — Y-malli
- Asiakkaalla **nykyiset tiedot** (helppo löytää listalta)
- Hoitokerralla **silloinen snapshot** (historia tallessa)
- Sisäinen UUID-id pysyy aina samana — nimi/yhteystiedot voivat muuttua
- Pieni duplikointi hyväksyttävä — selkeyden vuoksi

---

## Vaihe 1 — Asiakastietolomake osiot 1–5 (käynnissä)

**Tavoite:** Hoitaja voi syöttää uuden asiakkaan tiedot lomakkeen kautta. Sama lomake näyttää tallennetut tiedot myös myöhemmin.

**Tehty (tietokanta):**
- ✅ Tietokanta uusittu (lomakeversiot, sairaudet referenssitauluna)
- ✅ `normalisoiAsiakas` päivitetty
- ✅ `useAsiakkaanSairaudet` -hook luotu

**Suunnittelu valmis:**
- ✅ Käyttöliittymän tyyli (C-malli, pyyhkäisy + nuolet)
- ✅ Tilanhallinta (hybridi-tallennus)
- ✅ Pakolliset kentät (5 + ehdollinen sähköposti)
- ✅ Asiakkaan etsiminen (kaksi nappia, haku)
- ✅ Identiteetti (Y-malli, UUID)

**Tehtävänä (käyttöliittymä):**
- ⏳ Konkreettinen osio-suunnittelu (osio 1: Asiakastiedot — tarkka layout)
- ⏳ Asiakastietolomake-komponentti (uusi, korvaa AsiakasKortti + ClientForm)
- ⏳ 5 osion C-tyylinen näkymä
- ⏳ Pyyhkäisy + nuolet -navigointi
- ⏳ Osio-pisteet ylhäällä, klikkaus hyppää osioon
- ⏳ Pakolliset kentät merkittynä
- ⏳ Tallennus oikein (lomake-snapshot hoitokerralle)
- ⏳ Esikatselu + tulostus säilyy

**Hylättynä (ei rakenneta):**
- ❌ AsiakasKortti — yhdistettiin lomakkeeseen
- ❌ Erilliset välilehdet (Havainnot, Kehokartta jne.) — kaikki yhden lomakkeen osioita

---

## Vaihe 2 — Asiakastietolomake osiot 6–8 (seuraava)

**Tavoite:** Hoitaja täydentää havainnot, kuvantamiset ja hoitoraportin **samalle lomakkeelle** — ei erillistä näkymää.

**Sisältö:** ks. yllä Lomakkeen 8 osiota -taulukko.

**Hyödyt:** Voit lopettaa paperilla kirjaamisen kokonaan.

---

## Vaihe 3 — Palvelut Asetuksiin

**Tavoite:** Hoitaja voi lisätä omat palvelunsa, kuvaukset ja kestot.

**Sisältö:**
- `palvelut`-taulu (hoitaja_id, nimi, kuvaus, kesto, hinta, järjestys, aktiivinen)
- Asetukset-sivun palvelut-välilehti
- Hoitajaprofiili (nimi, esittely, kuva, koulutukset)

**Hyödyt:** Pohja vaiheille 4 (sähköinen lomake) ja 6 (sivusto).

---

## Vaihe 4 — Sähköinen lomake asiakkaalle

**Tavoite:** Asiakas täyttää lomakkeen osiot 1–5 itse ennen ajanvarausta.

**Sisältö:**
- Sama lomake kuin vaiheessa 1, mutta **asiakkaan käyttöön**
- URL: `/varaa` (yksi lomake, palveluvalinta osiossa 3 alussa)
- Tukee suoria linkkejä `?palvelu=X` markkinointia varten
- Tallentaa `asiakastietolomake_versiot`-tauluun
- **Lomakkeen täytön jälkeen:** asiakas saa kirjautumistunnukset sähköpostiin
- **Lomakkeen lähetyksen jälkeen:** suora siirto Vellon ajanvaraukseen
- Korvataan nykyinen "Kiitos ajanvarauksesta" -popup portaalin esittelyllä (vaihe 5)

**Hyödyt:** Asiakas tulee hoitoon valmiiksi täytetty lomake taustalla.

---

## Vaihe 5 — Asiakasportaali (passwordless)

**Tavoite:** Asiakas kirjautuu omaan portaaliin sähköpostilinkillä, näkee tietonsa, voi päivittää lomakkeen ja varata jatkohoitoja ilman uutta lomaketta.

**Kirjautuminen — passwordless:**
- Asiakas kirjoittaa sähköpostin
- Saa sähköpostiin linkin: "Klikkaa kirjautuaksesi"
- Linkki toimii kerran, esim. 15 min
- **Ei salasanoja** — ei mitään unohdettavaa
- Ratkaisee myös pitkän tauon — toimii aina

**Sisältö:**
- "Omat tiedot" -näkymä (osiot 1–5 lomakkeesta, asiakas voi muokata)
- "Hoitohistoria" — aiemmat hoitokerrat
- "Itsehoito-ohjeet" — synkronoituu havainnoista (vaihe 8)
- "Varaa uusi aika" — suoraan ajanvaraukseen, ei uutta lomaketta
- "Päivitä oiretilanne" — asiakas voi kertoa muutoksista hoitajan tietoon

**Lomakkeen täytön jälkeen** asiakkaalle tulee viesti:
> ✓ Lomake lähetetty, kiitos!
>
> Sait sähköpostiisi kirjautumistunnukset asiakasportaaliin.
> Portaalissa voit tarkistaa hoitotietosi, varata jatkohoitoja
> ilman lomaketta ja päivittää oiretilannetta.
>
> [Avaa portaali nyt →]

**Tietokanta on jo valmis tähän:** RLS sallii asiakkaan lukea omat tietonsa.

---

## Vaihe 6 — Julkinen sivusto

**Tavoite:** Korvaa nykyinen kalevalapaja.fi (WordPress).

**Sisältö:**
- Etusivu (palvelut, hinnasto)
- Hoitajaesittely (vaihe 3:n datasta)
- Palvelukuvaukset (vaihe 3:n palveluista)
- Yhteystiedot
- Blogi/artikkelit (myöhemmin)

**Domain-päätös tehtävänä:** kalevalapaja.fi vs app.kalevalapaja.fi vs muu.

---

## Vaihe 7 — Ajanvaraus

**Tavoite:** Korvaa Vello — ajanvaraus omaan järjestelmään.

**Sisältö:**
- Hoitajan vapaat ajat (toistuvat säännöt)
- Lomat ja poikkeukset
- Asiakkaan kalenteri-näkymä
- Vahvistus-sähköpostit
- Peruutukset ja muutokset
- Tuplabookkausten esto
- **Hoitaja voi varata jatkoajan suoraan hoidon päätyttyä** (yksi yleisin tilanne)
- **Asiakas voi varata portaalista** (vaihe 5)

**Iso työ.** Tehdään huolella.

---

## Vaihe 8 — Itsehoito-ohjeet

**Tavoite:** Asiakas saa harjoitukset videoineen ja kuvineen portaaliin.

**Sisältö:**
- Harjoituskirjasto
- Hoitaja valitsee asiakkaan ohjelmaan harjoituksia
- **Synkronoituu lomakkeen havainnoista** automaattisesti
- Asiakas näkee oman ohjelman portaalissa
- Videot ja kuvat Supabase Storagessa

---

## Vaihe 9 — AI-tuki hoidon aikana

**Tavoite:** AI ehdottaa hoitosuunnitelmaa havaintojen perusteella, hoitaja hyväksyy.

**Sisältö:**
- AI-ehdotukset hoitokäynnillä
- Kontraindikaatio-varoitukset automaattisesti
- Itsehoito-harjoitusten ehdotus
- Hoitaja muokkaa/hyväksyy ehdotukset
- Tallentaa sekä alkuperäisen että muokatun version (`ai_ehdotukset`-taulu)

**Tietokanta on jo valmis tähän.**

---

## Vaihe 10 — Skaalaus

**Tavoite:** Sovellus toimii muille hoitajille — Oxa myy palvelua.

**Sisältö:**
- Multi-tenant kunnolla
- Tilausjärjestelmä (kuukausimaksu Stripe)
- Tilastot ja raportit
- Verotusraportit
- Asiakaspalvelu

---

## Avoimet ideat — myöhemmin

Nämä eivät ole vaiheissa, mutta on hyvä muistaa:

- **Hoitaja voi lisätä asiakkaan ilman sähköpostia** (yleisötapahtumat, iäkkäät asiakkaat) — sähköposti suositeltu mutta ei pakollinen kun hoitaja täyttää
- **Asiakas voi päivittää oiretilannetta portaalissa** (vaihe 5) — hoitaja näkee päivityksen ennen seuraavaa hoitoa
- **Hoitaja voi pyytää lomakkeen päivitystä** sähköpostilla jos asiakkaan tiedot ovat vanhat
- **Aikaperusteinen tarkistus** — yli 6 kk taukoa → muistutus tarkistaa tiedot, yli 2 v → koko lomake uudestaan
- **Palvelukohtaiset erikoiskysymykset** — esim. tantrahieronnassa tietoiset suostumukset
- **Maksaminen** — Stripe-integraatio (osa vaihetta 7 tai 10)
- **Sähköpostimuistutukset** — automaattisesti ennen hoitokäyntiä (säilytetään nykyinen viikon päästä lähetettävä muistutus)
- **Sähköposti-ilmoitus uudesta lomakkeesta** — hoitajalle valittavissa Asetuksissa
- **Kontraindikaatio-AI** — varoittaa automaattisesti hoitomenetelmästä jos sairaus
- **Tarjoukset asiakkaille** — esim. paketit, alennukset
- **Kalevala Syndicate -integraatio** — Discord-yhteys
- **Espanja-muutto** — varmistettava että sovellus toimii etänä

---

## Domain ja hosting (myöhemmin päätettäväksi)

Nykyinen tilanne:
- `kehokorjaamo-app.vercel.app` (kehitysympäristö)
- `kalevalapaja.fi` (WordPress, Hostinger/Domainhotelli)
- Nykyinen ajanvaraus: Vello

Ratkaisu päätetään vaiheessa 6 (julkinen sivusto):
- Vaihtoehto A: kalevalapaja.fi → uusi sovellus, WordPress pois
- Vaihtoehto B: app.kalevalapaja.fi sovellukselle, kalevalapaja.fi pysyy
- Vaihtoehto C: oma domain (esim. kehokorjaamo.fi)

---

## Periaatteet — älä riko näitä

Nämä ovat sovittu projektin alussa, kannattaa pitää mielessä:

1. **Yksi lomake koko ketjun ajan** — ei erillisiä komponentteja eri vaiheille
2. **Osio kerrallaan -navigointi** (pyyhkäisy + nuolet)
3. **MVP-lähestymistapa** — toimiva paketti ensin, kehitys käytön myötä
4. **AI ehdottaa, hoitaja päättää** — kaikki AI-tuotettu sisältö on ehdotuksia
5. **Vertailukelpoisuus** — hoitokäyntien data tallennetaan rakenteellisesti
6. **Yksi totuuden lähde** — Supabase, ei duplikoitua dataa
7. **Suomenkieliset muuttujanimet** — `asiakas`, `hoitokaynti`, `havainnot`
8. **Null-suoja** — kaikkialla missä luetaan tietokannasta
9. **Yhden vastuun periaate** — yksi funktio = yksi tehtävä
10. **RLS aina päällä** — hoitaja näkee vain omat asiakkaansa
11. **Versiointi** — hoitokerta = lomake-snapshot (asiakkaalla nykyiset tiedot, hoitokerralla silloinen)
12. **Mobiilikäyttö ensin** — toimii puhelimella ennen kuin desktopilla
13. **Joustavuus** — referenssitaulut hoitajan muokattavissa, `lisakentat`-jsonb tulevaisuutta varten
14. **Helppokäyttöisyys ennen kaikkea** — *"Onko tämä helppo Oxalle kiireisenä päivänä?"* on jokaisen päätöksen testi
15. **Vahinkopainallusten esto** — isot kosketuspinnat, välit, kumoa-toiminto, pyyhkäisy-minimimatka
16. **Passwordless-kirjautuminen** asiakasportaaliin — ei salasanoja, vain sähköpostilinkki
