# Kehokorjaamo App — Roadmap

> **Tarkoitus:** Tämä tiedosto kertoo missä mennään ja minne ollaan menossa.
> Päivitä aina kun vaihe valmistuu tai suunnitelma muuttuu.
> Kun aloitat uuden Claude-chatin, voit sanoa: *"Lue ROADMAP.md ja jatka vaiheesta X"*.

**Viimeisin päivitys:** 2026-04-28 (suunnitelma uudistettu — yksi lomake, ei erillisiä komponentteja)

---

## Vaiheet ja status

| # | Vaihe | Status | Huom |
|---|-------|--------|------|
| 1 | Asiakastietolomake — osiot 1–5 (asiakkaan osa) | 🟡 Suunnittelu valmis, koodaus alkaa | C-tyyli: osio kerrallaan, pyyhkäisy + nuolet |
| 2 | Asiakastietolomake — osiot 6–8 (hoitajan osa) | ⚪ Odottaa | Lisätään kun osiot 1–5 toimivat |
| 3 | Palvelut + hoitajaprofiili Asetuksiin | ⚪ Odottaa | Pohja sivustolle ja lomakkeelle |
| 4 | Sähköinen lomake asiakkaalle (osiot 1–5) | ⚪ Odottaa | Asiakas täyttää itse ennen ajanvarausta |
| 5 | Asiakasportaali (oma kirjautuminen) | ⚪ Odottaa | Tietokanta jo valmis tähän (RLS) |
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
| 1 | **Asiakastiedot** | Nimi, syntymäaika, yhteystiedot, osoite, ammatti, pituus/paino | Nimi, ikä, sähköposti, puhelin |
| 2 | **Sairaudet ja terveys** | Sairauslista (24 kpl checkboxia), lääkitys, allergiat, vammat | — |
| 3 | **Hoitoon tulon syy** | Vapaa tekstikenttä, kipuaste 0–10, toiveet hoidolta | Hoitoon tulon syy |
| 4 | **Asiakkaan kehonkartta** | Kuvat (etu/sivu/taka) joihin asiakas merkitsee oireet sormella | — |
| 5 | **Suostumukset** | Tietosuojaseloste, GDPR, allekirjoitus | Allekirjoitus, tietosuoja |

### Hoitajan osa (osiot 6–8) — vaihe 2

| # | Osio | Sisältö |
|---|------|---------|
| 6 | **Havainnot ja löydökset** | Asentohavainnot (kallistus, kierto jne.) + 10 anatomista aluetta |
| 7 | **Kuvantamiset** | Puhelimella otetut kuvat + niihin merkityt pisteet ja lasketut kulmat |
| 8 | **Hoitoraportti** | Lähtötilanne, hoidon kulku, muista ensi kerralla — kasvaa käynti kerralta |

---

## Käyttöliittymän periaatteet

**Navigointi osioiden välillä:**
- Pyyhkäisy vasemmalle / oikealle (mobiili, tabletti)
- Nuolinapit ◄ EDELLINEN | SEURAAVA ► (kaikki laitteet)
- Pisteet/numerot ylhäällä — klikkaa hyppää suoraan osioon

**Visuaaliset ilmaisimet:**
- ● = osio täytetty (vihreä)
- ◉ = nykyinen osio
- ○ = tyhjä, ei vielä täytetty (harmaa)
- ⭐ = pakollinen kenttä merkittynä punaisella tähdellä

**Tilannekohtaiset elementit:**
- Tallenna-nappi aina näkyvissä (voi tallentaa missä tahansa osiossa)
- Esikatselu mahdollinen (näyttää koko lomakkeen kerralla)
- Tulostus (sama paperilomake kuin nyt)

---

## Vaihe 1 — Asiakastietolomake osiot 1–5 (käynnissä)

**Tavoite:** Hoitaja voi syöttää uuden asiakkaan tiedot lomakkeen kautta. Sama lomake näyttää tallennetut tiedot myös myöhemmin.

**Tehty (tietokanta):**
- ✅ Tietokanta uusittu (lomakeversiot, sairaudet referenssitauluna)
- ✅ `normalisoiAsiakas` päivitetty
- ✅ `useAsiakkaanSairaudet` -hook luotu

**Tehtävänä (käyttöliittymä):**
- ⏳ Asiakastietolomake-komponentti (uusi, korvaa AsiakasKortti + ClientForm)
- ⏳ 5 osion C-tyylinen näkymä
- ⏳ Pyyhkäisy + nuolet -navigointi
- ⏳ Osio-pisteet ylhäällä, klikkaus hyppää osioon
- ⏳ Pakolliset kentät merkittynä
- ⏳ Tallennus oikein (lomakeversio + sairaudet)
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

**Hyödyt:** Asiakas tulee hoitoon valmiiksi täytetty lomake taustalla.

---

## Vaihe 5 — Asiakasportaali

**Tavoite:** Asiakas kirjautuu omaan portaaliin, näkee tietonsa, voi päivittää lomakkeen.

**Sisältö:**
- Asiakkaan oma Auth-rekisteri (Supabase Auth)
- "Omat tiedot" -näkymä (osiot 1–5 lomakkeesta)
- "Päivitä tiedot" → uusi lomakeversio
- Hoitohistorian katselu
- Itsehoito-ohjeet
- Ajanvarauslinkki (Vello tai vaihe 7)

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

- **Palvelukohtaiset erikoiskysymykset** — esim. tantrahieronnassa tietoiset suostumukset
- **Maksaminen** — Stripe-integraatio (osa vaihetta 7 tai 10)
- **Sähköpostimuistutukset** — automaattisesti ennen hoitokäyntiä
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
11. **Versiointi** — kun lomake päivittyy, vanha versio säilyy historiana
12. **Mobiilikäyttö ensin** — toimii puhelimella ennen kuin desktopilla
13. **Joustavuus** — referenssitaulut hoitajan muokattavissa, `lisakentat`-jsonb tulevaisuutta varten
14. **Helppokäyttöisyys ennen kaikkea** — *"Onko tämä helppo Oxalle kiireisenä päivänä?"* on jokaisen päätöksen testi
