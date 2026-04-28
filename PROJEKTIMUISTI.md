# Kehokorjaamo App — Projektimuisti

> **Tarkoitus:** Tämä tiedosto kerää tehdyt päätökset, periaatteet ja hylätyt vaihtoehdot.
> Roadmap kertoo mitä tehdään, projektimuisti kertoo miksi.
> Päivitä kun teet ison päätöksen.

**Viimeisin päivitys:** 2026-04-28

---

## Käytössä olevat työkalut

- **Frontend:** React + Vite + Tailwind
- **Hosting:** Vercel (kehokorjaamo-app.vercel.app)
- **Database + Auth:** Supabase (PKCE-flow, projekti-ID `uwysictfbzswecnxvmif`)
- **Versionhallinta:** GitHub (`oxainn/Kehokorjaamo-App`)
- **AI-koodaus:** Claude Code + Claude Chat (Claude Max -tilaus)
- **Domain (nykyinen):** kehokorjaamo-app.vercel.app
- **Domain (tuleva):** päätetään vaiheessa 6, ks. Roadmap

---

## Tietokanta — rakenne ja päätökset

### Päätaulut

| Taulu | Tarkoitus | Versionti? |
|-------|-----------|------------|
| `asiakkaat` | Henkilötiedot | Ei |
| `asiakastietolomake_versiot` | Lomake versioituna | **Kyllä** |
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

### Versiointi-logiikka

Lomakeversio on **uniikki** asiakkaalle ja sillä on:
- `versio_nro` (1, 2, 3...) — automaattinen trigger laskee
- `voimassa_alkaen` (timestamp)
- `voimassa_asti` (NULL = nykyinen versio)

Kun uusi versio luodaan, trigger asettaa vanhan version `voimassa_asti = nyt`.

Hoitokäynti tallentaa `lomake_versio_id`:n — siten näkee aina millä tiedoilla hoito tehtiin.

---

## Tehdyt päätökset

### 2026-04-28 — Tietokanta uusittiin puhtaalta pöydältä

**Päätös:** Vanhat taulut (`hoitokaynit`, `esitiedot`, `uudet_asiakkaat`) tiputettiin, testidata pyyhittiin.

**Miksi:** Vanha rakenne oli pelkkä jsonb-pussi → ei vertailukelpoisuutta. Testidataa vain 3+8 riviä, ei menetystä.

**Tilalle:** 14 taulua + 3 näkymää, RLS aina päällä, automaattinen versiointi.

### 2026-04-28 — Sairauslista tehtiin referenssitauluna

**Päätös:** Sairaudet eivät ole jsonb-kentässä eikä boolean-sarakkeina, vaan omassa `sairaus_tyypit`-taulussa.

**Miksi:** Hoitaja voi lisätä uusia sairauksia ilman koodimuutosta. Tukee laajaa käyttäjäkuntaa.

**Vaikutus:** `lomake_sairaudet`-taulu yhdistää lomakeversion ja sairaustyypin.

### 2026-04-28 — Kontraindikaatio ei punaista bannereita

**Päätös:** Kontraindikaatio-varoitusta ei korosteta isolla bannerilla AsiakasKortissa.

**Miksi:** Käytännössä kontraindikaatio käy ilmi hoidon kuvauksessa muutenkin. Liika varoittelu turruttaa.

**Vaikutus:** Kontraindikaatiot listataan sairauksien yhteydessä erottuvasti (esim. ⚠-merkki), mutta ei erillistä bannereita.

### 2026-04-28 — Kehonkartta = kuva, ei dataa (asiakkaan puoli)

**Päätös:** Asiakas piirtää kehonkartan sormella/hiirellä — tallennetaan kuvana.

**Miksi:** Visuaalinen tieto riittää hoitajalle. Pisteistä rakenteistettu data olisi liian raskas asiakkaalle.

**Vaikutus:** `asiakastietolomake_versiot.kehonkartta_kuva_url` tallentaa Storage-linkin.

**Tulevaisuudessa:** Hoitajan oma kehonkartta voi olla strukturoitu (`kehonkartta_pisteet`-taulu), suunnitelma kesken.

### 2026-04-28 — Yksi lomake, palveluvalinta ylhäällä

**Päätös:** Asiakastietolomake on yksi sähköinen lomake, jossa palveluvalinta on ensimmäinen kenttä.

**Miksi:** Helppo ylläpitää. Asiakas valitsee palvelun (Kalevalainen jäsenkorjaus, Tantrahieronta jne.), näkee kuvauksen avattavana osiona.

**Tukee myös:** Suorat linkit muodossa `/varaa?palvelu=jasenkorjaus` markkinointia varten.

### 2026-04-28 — Custom hook `useAsiakkaanSairaudet`

**Päätös:** Sairauksien haku tehdään custom hookilla, ei App.jsx:n staten kautta.

**Miksi:** App.jsx pysyy kevyenä. Yhden vastuun periaate. Komponentit jotka tarvitsevat sairauksia, hakevat ne itse.

**Sijainti:** `src/hooks/useAsiakkaanSairaudet.js`.

---

## Hylätyt vaihtoehdot

### Hylätty: Sairaudet jsonb-kenttänä

**Ehdotus:** `asiakastietolomake_versiot.sairaudet` yksi jsonb-objekti.

**Hylätty koska:** Ei muokattavissa hoitajan toimesta, ei skaalaudu uusille käyttäjille.

### Hylätty: Erillinen `kontraindikaatiot`-kenttä

**Ehdotus:** Tallennetaan kontraindikaatiot omaan kenttään.

**Hylätty koska:** Kontraindikaatio johdetaan suoraan `sairaus_tyypit.kontraindikaatio = true` -kentästä. Yksi totuuden lähde.

### Hylätty: Asentohavainnot ja rakenteelliset eri tauluihin

**Ehdotus:** Erilliset taulut sivun 1 ja sivun 2 havainnoille.

**Hylätty koska:** Yhdistetään `havainnot`-tauluun `tyyppi`-kentällä — vähemmän duplikointia, helpompi vertailu.

### Hylätty: Iso "kontraindikaatio-banneri" punaisella

**Ehdotus:** AsiakasKortin yläosaan iso varoitus.

**Hylätty koska:** Hoitaja näkee kontraindikaatiot muutenkin sairauslistasta. Ei tarvita erillistä korostusta.

### Hylätty: ClientForm `readOnly`-tilassa

**Ehdotus:** Käytetään samaa lomaketta sekä katseluun että muokkaukseen.

**Hylätty koska:** Katselu ja muokkaus ovat eri tarpeita — visuaalisesti pitää erottua. Tehdään `AsiakasKortti` katseluun, `ClientForm` muokkaukseen.

---

## Avoimet kysymykset

Nämä on tunnistettu mutta ei vielä päätetty:

- **Domain:** vaiheessa 6 (kalevalapaja.fi vs app.kalevalapaja.fi vs muu)
- **Hoitajan kehonkartta:** strukturoitu vai pelkkä kuva — päätetään vaiheessa 2 (hoitokäynnin teko)
- **Multi-tenant arkkitehtuuri:** miten skaalataan kun muutkin hoitajat alkavat käyttää (vaihe 10)
- **Maksaminen:** Stripe-integraatio osana ajanvarausta vai erillinen vaihe
- **Sähköposti-ilmoitukset:** Edge functions Supabasessa vai ulkopuolinen palvelu

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

---

## Käytetyt periaatteet kun työskennellään Coden kanssa

1. Claude Chat suunnittelee, Claude Code toteuttaa
2. Suunnitelma → tarkistus → koodi → tarkistus → push
3. Pieni pala kerrallaan, ei isoja "tee kaikki" -pyyntöjä
4. Aina `npm run build` ennen pushia
5. Suomenkieliset muuttujanimet kaikkialla
6. Null-suoja kaikkialla missä luetaan tietokantaa
7. Tarkista että nykyiset toiminnot eivät rikkoudu

---

## Linkkejä

- **Sovellus:** https://kehokorjaamo-app.vercel.app/
- **GitHub:** https://github.com/oxainn/Kehokorjaamo-App
- **Supabase:** https://supabase.com/dashboard/project/uwysictfbzswecnxvmif
- **Nykyinen kotisivu:** https://kalevalapaja.fi/
- **Vello (ajanvaraus):** korvataan vaiheessa 7
