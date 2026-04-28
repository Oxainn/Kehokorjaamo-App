# Kehokorjaamo App — Projektimuisti

> **Tarkoitus:** Tämä tiedosto kerää tehdyt päätökset, periaatteet ja hylätyt vaihtoehdot.
> Roadmap kertoo mitä tehdään, projektimuisti kertoo miksi.
> Päivitä kun teet ison päätöksen.

**Viimeisin päivitys:** 2026-04-28 (suunnitelma uudistettu)

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

### 2026-04-28 — Suunnitelma uudistettu: yksi lomake, ei erillisiä komponentteja

**Päätös:** Asiakastietolomake on **yksi** lomake joka kasvaa hoitoketjun aikana. Ei AsiakasKortti-komponenttia, ei välilehtiä (Havainnot, Kehokartta jne.).

**Miksi:** Käyttäjä ilmaisi vision selkeästi: *"Mielellään yksi muunneltava lomake koko ketjun ajan."* Erilliset välilehdet rikkovat kokonaisuuden. Sama lomake palvelee sekä asiakasta että hoitajaa, vain osiot erillään.

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

**Miksi:** Käyttäjä sanoi: *"Saadaan paketti toimimaan, sitten kehitetään käyttökokemuksen myötä."* Tämä on viisaus jota Anthropic ja kaikki tuotekehityksen ammattilaiset suosittelevat.

**Vaikutus:**
- Vaihe 1: vain osiot 1–5 (asiakkaan osa)
- Vaihe 2: osiot 6–8 (hoitajan osa) lisätään myöhemmin
- Pakolliset kentät minimoidaan: nimi, ikä, sähköposti, puhelin, hoitoon syy, allekirjoitus, tietosuoja
- Muut osiot voi jättää tyhjiksi alkuun

### 2026-04-28 — Tietokanta uusittiin puhtaalta pöydältä

**Päätös:** Vanhat taulut (`hoitokaynit`, `esitiedot`, `uudet_asiakkaat`) tiputettiin, testidata pyyhittiin.

**Miksi:** Vanha rakenne oli pelkkä jsonb-pussi → ei vertailukelpoisuutta. Testidataa vain 3+8 riviä, ei menetystä.

**Tilalle:** 14 taulua + 3 näkymää, RLS aina päällä, automaattinen versiointi.

### 2026-04-28 — Sairauslista tehtiin referenssitauluna

**Päätös:** Sairaudet eivät ole jsonb-kentässä eikä boolean-sarakkeina, vaan omassa `sairaus_tyypit`-taulussa.

**Miksi:** Hoitaja voi lisätä uusia sairauksia ilman koodimuutosta. Tukee laajaa käyttäjäkuntaa.

**Vaikutus:** `lomake_sairaudet`-taulu yhdistää lomakeversion ja sairaustyypin.

### 2026-04-28 — Kontraindikaatio ei punaista bannereita

**Päätös:** Kontraindikaatio-varoitusta ei korosteta isolla bannerilla.

**Miksi:** Käytännössä kontraindikaatio käy ilmi hoidon kuvauksessa muutenkin. Liika varoittelu turruttaa.

**Vaikutus:** Kontraindikaatiot listataan sairauksien yhteydessä erottuvasti (esim. ⚠-merkki), mutta ei erillistä bannereita.

### 2026-04-28 — Kehonkartta = kuva, ei dataa (asiakkaan puoli)

**Päätös:** Asiakas piirtää kehonkartan sormella/hiirellä — tallennetaan kuvana.

**Miksi:** Visuaalinen tieto riittää hoitajalle. Pisteistä rakenteistettu data olisi liian raskas asiakkaalle.

**Vaikutus:** `asiakastietolomake_versiot.kehonkartta_kuva_url` tallentaa Storage-linkin.

**Tulevaisuudessa:** Hoitajan oma kehonkartta voi olla strukturoitu (`kehonkartta_pisteet`-taulu), suunnitelma kesken.

### 2026-04-28 — Yksi lomake, palveluvalinta osana lomaketta

**Päätös:** Asiakastietolomake on yksi sähköinen lomake, jossa palveluvalinta on osio 3:n alussa (hoitoon tulon syy).

**Miksi:** Helppo ylläpitää. Asiakas valitsee palvelun (Kalevalainen jäsenkorjaus, Tantrahieronta jne.), näkee kuvauksen avattavana osiona.

**Tukee myös:** Suorat linkit muodossa `/varaa?palvelu=jasenkorjaus` markkinointia varten.

### 2026-04-28 — Custom hook `useAsiakkaanSairaudet`

**Päätös:** Sairauksien haku tehdään custom hookilla, ei App.jsx:n staten kautta.

**Miksi:** App.jsx pysyy kevyenä. Yhden vastuun periaate. Komponentit jotka tarvitsevat sairauksia, hakevat ne itse.

**Sijainti:** `src/hooks/useAsiakkaanSairaudet.js`.

---

## Hylätyt vaihtoehdot

### Hylätty: AsiakasKortti-komponentti (omana näkymänä)

**Ehdotus:** Erillinen "kortti"-komponentti read-only katseluun, ClientForm muokkaukseen.

**Hylätty koska:** Käyttäjä halusi yhtä lomaketta, ei kahta erillistä komponenttia. Lisäsi monimutkaisuutta ilman lisäarvoa.

**Korvaava ratkaisu:** Yksi `Asiakastietolomake`-komponentti joka näyttää kaikki tiedot. Lomake voi olla luku- tai muokkaustilassa tarvittaessa, mutta osiojako on sama.

### Hylätty: Erilliset välilehdet (Havainnot, Kehokartta jne.)

**Ehdotus:** Käyntinäkymässä monta välilehteä eri toiminnoille.

**Hylätty koska:** Käyttäjä ilmaisi: *"Erilliset välilehdet mielestäni rikkoo kokonaisuuden."* Lomakkeen pitää olla yhtenäinen.

**Korvaava ratkaisu:** Kaikki entiset "välilehdet" ovat osioita yhdessä lomakkeessa (osiot 6–8).

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

**Hylätty koska:** Korvautui paremmalla ratkaisulla (yksi Asiakastietolomake, jossa selkeä osio-rakenne).

---

## Avoimet kysymykset

Nämä on tunnistettu mutta ei vielä päätetty:

- **Domain:** vaiheessa 6 (kalevalapaja.fi vs app.kalevalapaja.fi vs muu)
- **Hoitajan kehonkartta:** strukturoitu vai pelkkä kuva — päätetään vaiheessa 2 (osio 6 — havainnot)
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

---

## Linkkejä

- **Sovellus:** https://kehokorjaamo-app.vercel.app/
- **GitHub:** https://github.com/oxainn/Kehokorjaamo-App
- **Supabase:** https://supabase.com/dashboard/project/uwysictfbzswecnxvmif
- **Nykyinen kotisivu:** https://kalevalapaja.fi/
- **Vello (ajanvaraus):** korvataan vaiheessa 7
