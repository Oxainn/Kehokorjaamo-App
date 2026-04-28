# Kehokorjaamo App — Roadmap

> **Tarkoitus:** Tämä tiedosto kertoo missä mennään ja minne ollaan menossa.
> Päivitä aina kun vaihe valmistuu tai suunnitelma muuttuu.
> Kun aloitat uuden Claude-chatin, voit sanoa: *"Lue ROADMAP.md ja jatka vaiheesta X"*.

**Viimeisin päivitys:** 2026-04-28

---

## Vaiheet ja status

| # | Vaihe | Status | Huom |
|---|-------|--------|------|
| 1 | Asiakaskortti — uusi rakenne | 🟡 Käynnissä | Tietokanta valmis, hookki valmis, AsiakasKortti rakennetaan |
| 2 | Hoitokäynnin teko ja tallennus | ⚪ Odottaa | Lopettaa paperilla kirjaamisen |
| 3 | Palvelut + hoitajaprofiili Asetuksiin | ⚪ Odottaa | Pohja sivustolle ja lomakkeelle |
| 4 | Sähköinen asiakastietolomake | ⚪ Odottaa | Asiakas täyttää sähköisesti |
| 5 | Asiakasportaali (oma kirjautuminen) | ⚪ Odottaa | Tietokanta jo valmis tähän (RLS) |
| 6 | Julkinen sivusto | ⚪ Odottaa | Korvaa kalevalapaja.fi WordPress |
| 7 | Ajanvaraus | ⚪ Odottaa | Korvaa Vellon |
| 8 | Itsehoito-ohjeet portaaliin | ⚪ Odottaa | Videot ja kuvat |
| 9 | AI-tuki hoidon aikana | ⚪ Odottaa | Ehdotukset hoitosuunnitelmaan |
| 10 | Tilastot, raportit, multi-hoitaja | ⚪ Odottaa | Skaalaus muille hoitajille |

**Status-merkit:** 🟢 Valmis · 🟡 Käynnissä · ⚪ Odottaa · 🔴 Jumissa

---

## Vaihe 1 — Asiakaskortti (käynnissä)

**Tavoite:** Kun klikkaat asiakasta listalta, näet kompaktin yhteenvedon — ei muokkauslomaketta.

**Tehty:**
- ✅ Tietokanta uusittu (lomakeversiot, sairaudet referenssitauluna jne.)
- ✅ `normalisoiAsiakas` päivitetty
- ✅ Asiakaslista hakee `asiakkaan_nykyinen_lomake`-näkymästä
- ✅ Custom hook `useAsiakkaanSairaudet` luotu
- ✅ Hookki siivottu pois App.jsx:stä

**Tehtävänä:**
- ⏳ AsiakasKortti-komponentti (uusi)
- ⏳ Avautuu kun klikkaa asiakasta listalta
- ⏳ ClientForm säilyy muokkausta varten ("Muokkaa"-nappi)

**Suunnittelu päätetty:**
- Logo + nimi ylös
- Selkeä scrollattava kokonaisuus
- Mobiilikäyttö ensin
- Ei isoa kontraindikaatio-bannereita (käy ilmi muutenkin)

---

## Vaihe 2 — Hoitokäynnin teko (seuraava)

**Tavoite:** Pystyt kirjaamaan hoitokäynnin tiedot suoraan järjestelmään.

**Sisältö:**
- Päivän esitiedot (kunto, uni, stressi, kipu)
- Havainnot (asentomuutokset + rakenteelliset alueittain)
- Hoitoraportti (lähtötilanne, kulku, muista ensi kerralla)
- Käyntien linkitys lomakeversioon (snapshot)

**Hyödyt:** Voit lopettaa paperilla kirjaamisen.

---

## Vaihe 3 — Palvelut Asetuksiin

**Tavoite:** Hoitaja voi lisätä omat palvelunsa, niiden kuvaukset ja kestot.

**Sisältö:**
- `palvelut`-taulu (hoitaja_id, nimi, kuvaus, kesto, hinta, järjestys, aktiivinen)
- Asetukset-sivun palvelut-välilehti
- Hoitajaprofiili (nimi, esittely, kuva, koulutukset)

**Hyödyt:**
- Pohja vaiheille 4 (lomake) ja 6 (sivusto)
- Sovellus toimii muillekin hoitajille kuin Oxa

---

## Vaihe 4 — Sähköinen asiakastietolomake

**Tavoite:** Uusi asiakas täyttää lomakkeen sähköisesti — ei paperia.

**Sisältö:**
- Lomake-URL: `/varaa` (yksi lomake, palveluvalinta päällä)
- Tukee suoria linkkejä `?palvelu=X` markkinointia varten
- Sairaudet checkboxeina (tulee `sairaus_tyypit`-taulusta)
- Asiakkaan kehonkartta-piirto (sormella/hiirellä)
- Tallentaa `asiakastietolomake_versiot`-tauluun versiona

**Hyödyt:** Asiakas tulee hoitoon valmiiksi täytetty lomake taustalla.

---

## Vaihe 5 — Asiakasportaali

**Tavoite:** Asiakas kirjautuu omaan portaaliin, näkee tietonsa, voi päivittää lomakkeen.

**Sisältö:**
- Asiakkaan oma Auth-rekisteri (Supabase Auth)
- "Omat tiedot" -näkymä
- "Päivitä tiedot" -nappi → uusi lomakeversio
- Hoitohistorian katselu
- Itsehoito-ohjeet
- Ajanvarauslinkki (Vello tai vaihe 7)

**Tietokanta on jo valmis tähän:** RLS-säännöt sallivat asiakkaan lukea omat tietonsa.

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
- Harjoituskirjasto (yhteinen kaikille hoitajille tai oma)
- Hoitaja valitsee asiakkaan ohjelmaan harjoituksia
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
- Multi-tenant kunnolla (oma domain per hoitaja?)
- Tilausjärjestelmä (kuukausimaksu Stripe)
- Tilastot ja raportit (asiakasmäärät, hoitokerrat, tulot)
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

1. **AI ehdottaa, hoitaja päättää** — kaikki AI-tuotettu sisältö on ehdotuksia
2. **Vertailukelpoisuus** — hoitokäyntien data tallennetaan rakenteellisesti
3. **Yksi totuuden lähde** — Supabase, ei duplikoitua dataa
4. **Suomenkieliset muuttujanimet** — `asiakas`, `hoitokaynti`, `havainnot`
5. **Null-suoja** — kaikkialla missä luetaan tietokannasta
6. **Yhden vastuun periaate** — yksi funktio = yksi tehtävä
7. **RLS aina päällä** — hoitaja näkee vain omat asiakkaansa
8. **Versiointi** — kun lomake päivittyy, vanha versio säilyy historiana
9. **Mobiilikäyttö ensin** — toimii puhelimella ennen kuin desktopilla
10. **Joustavuus** — referenssitaulut hoitajan muokattavissa, `lisakentat`-jsonb tulevaisuutta varten
