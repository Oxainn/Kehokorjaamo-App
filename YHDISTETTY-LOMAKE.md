# YHDISTETTY-LOMAKE — A+B yhdistys yhdeksi Asiakastietolomakkeeksi

> ⚙️ **AB-VAIHE käynnissä (alkanut 2026-05-03)**
>
> A-lomake (asiakkaan esitietolomake) ja B-lomake (hoitajan kirjauslomake) yhdistetään yhdeksi yhteiseksi Asiakastietolomakkeeksi joka sisältää sekä asiakkaan että hoitajan osiot.
>
> **R1 jää jäissä:** R1-T4 (try/catch), R1-T5b/c/d (kuolleen koodin loput) ja R1-T6 (lomake-kansiot) odottavat A+B-vaiheen valmistumista. A+B itsessään korvaa monta vanhaa tallennusfunktiota, joten R1-loppuvaiheet hoidetaan A+B:n päätyttyä uudessa kontekstissa.

---

## Tausta — miksi A+B yhdistetään

Aiempi malli:
- A-lomake (asiakkaan täyttämä esitietolomake) → julkinen URL kotisivulta, asiakas täyttää etukäteen
- B-lomake (hoitajan täyttämä havaintolomake) → erillinen näkymä, hoitaja täyttää käynnillä
- Kaksi erillistä komponenttia, kaksi erillistä tallennustasoa, monimutkainen flow

Uusi malli (Oxan päätös 2026-05-03):
- Yksi yhdistetty **Asiakastietolomake** jossa kaksi osaa: asiakkaan kirjaukset + hoitajan kirjaukset
- Lomake täytetään aina paikan päällä yhdessä, ennen hoidon aloittamista
- Kotisivun etukäteistäyttö poistettu (palautetaan myöhemmin oikeusrajauksen kanssa kun toiminto on testattu vakaaksi)
- Hoitaja rakentaa palvelukohtaisen lomakepohjan (sisältää sekä asiakkaan että hoitajan osiot)
- Snapshot-malli: jokainen käynti tallentuu lukittuna tilannekuvana

---

## Sovitut ratkaisut

| # | Asia | Päätös |
|---|---|---|
| 1 | Lomakemalli | Yksi yhdistetty Asiakastietolomake (asiakkaan + hoitajan osiot) |
| 2 | Snapshot-malli | Joka käynti lukittu, ei muutu jälkeenpäin |
| 3 | Palvelun valinta | Aina ennen lomaketta — määrittää lomakepohjan |
| 4 | "Avaa lomake" | Sama palvelu = edellisen käynnin pohjalta; eri palvelu = tyhjä |
| 5 | Pysyvät vs muuttuvat | Hoitaja merkitsee joka kentälle lomakepohjaeditorissa |
| 6 | UI-flow | Asiakkaan osio → [Aloita uusi käynti] → Hoitajan osio → [Tallenna käynti] |
| 7 | Näyttötyylit | 3 vaihtoehtoa säilytetään (Accordion / Osio kerrallaan / Yksi sivu) |
| 8 | Tallennusrytmi | Automaattinen luonnostallennus + lopussa lukitseva tallennus |
| 9 | Rekisteri | Asiakkaat-nappi → rekisteri → "+ Uusi asiakas" tai klikkaa olemassa olevaa |
| 10 | Etukäteistäyttö | Ei nyt — myöhemmin oikeusrajauksen kanssa |
| 11 | Kuvantaminen | Vapaaehtoinen, säilyy nykyisellään (tabletti-pohjainen) |

---

## Toteutusvaiheet (AB0–AB8)

| Vaihe | Sisältö | Arvio |
|---|---|---|
| **AB0** | Tämä paperi `YHDISTETTY-LOMAKE.md` repon juureen | 1 commit |
| **AB1** | Lomakepohjaeditorin laajennus — joka kentälle "Pysyvä/Muuttuva" -merkintä + DB-skeeman päivitys (`kentan_versiot.pysyva` -sarake) | 2-3 commitia |
| **AB2** | Visuaalinen erottelu lomakkeessa — asiakkaan osio vs hoitajan osio (otsikot, ehkä värikoodi) | 1-2 commitia |
| **AB3** | `[Aloita uusi käynti]` -nappi lomakkeen runtime-osaan + muuttuvien kenttien tyhjennys-logiikka | 2-3 commitia |
| **AB4** | Tallennuslogiikka — automaattinen luonnostallennus + "Tallenna käynti" -lukitus + snapshot-pohja | 3-4 commitia |
| **AB5** | "+ Uusi asiakas" -flow — palvelun valinta -näkymä → tyhjä lomake | 2 commitia |
| **AB6** | Olemassa olevan asiakkaan klikkaus → palvelun valinta → lomake edellisen käynnin pohjalta | 2 commitia |
| **AB7** | Kuva-analyysi-näkymä lomakkeen sisään (siirto Hoitokirjaus.jsx:stä lomake-runtimeen) | 2-3 commitia |
| **AB8** | Vanhojen reittien siivous (Hoitokirjaus.jsx, AsiakaslomakeRenderoijalla.jsx korvautuvat) | 2-3 commitia |

**Yhteensä:** ~17-22 commitia, n. 2-4 viikkoa rauhalliseen tahtiin.

---

## Mikä on SALLITTUA AB-vaiheessa

✅ A+B-yhdistykseen liittyvä työ vaiheiden AB1-AB8 mukaan
✅ Testien kirjoittaminen uusille A+B-funktioille
✅ Bugikorjaukset jotka estävät A+B:n etenemisen
✅ Tuotantokriittiset bugit erikseen tagilla `[KIIRE-BUG-FIX]` (sama kuin R1-vaiheessa)

---

## Mikä ON KIELLETTYÄ AB-vaiheessa

❌ R1-T4 / T5b-d / T6 -vaiheiden tekeminen — ne odottavat A+B:n loppumista
❌ Uusia ominaisuuksia jotka eivät liity A+B-yhdistykseen (roadmap-vaiheet C-G)
❌ Spontaaneja UI-paranteluja jotka eivät kuulu vaiheen AB-tehtävään
❌ Useita irrallisia muutoksia samassa committissa — yksi commit = yksi looginen muutos
❌ Push ilman että `npm run build` menee läpi paikallisesti
❌ Push ilman että uudet/muutetut testit menevät vihreänä

---

## Säännöt AI-istunnoille (Code, Cowork, kaikki Claude-istunnot)

Joka istunnon alussa:
1. **LUE TÄMÄ TIEDOSTO ENSIMMÄISENÄ** ennen kuin teet mitään muuta
2. Tarkista että toimeksianto kuuluu A+B:n piiriin (AB1-AB8 -taulukko)
3. Jos toimeksianto ei kuulu A+B:hen → kysy Oxalta tai pysähdy
4. Jos epäselvyyttä → kysy, älä arvaa

Commit-viestien tagit AB-vaiheen aikana:
- `[AB-T0]` tämä dokumentti
- `[AB-T1]` lomakepohjaeditorin laajennus
- `[AB-T2]` visuaalinen erottelu
- `[AB-T3]` Aloita uusi käynti -nappi
- `[AB-T4]` tallennuslogiikka
- `[AB-T5]` Uusi asiakas -flow
- `[AB-T6]` olemassa olevan klikkaus → lomake
- `[AB-T7]` kuvantaminen lomakkeessa
- `[AB-T8]` vanhojen reittien siivous
- `[KIIRE-BUG-FIX]` tuotantokriittinen bugi (poikkeustapaus)

Tahti: laatu on mitta, ei luku. Joka commit testattu, build vihreä, testit vihreänä ennen pushia. Oxa määrittelee oman päivätahtinsa.

---

## Mitä jää jonoon AB-vaiheen ajaksi

Nämä eivät katoa, ne hoidetaan A+B:n päätyttyä:

- R1-T4: try/catch + yhtenäinen `{ data, virhe }` -palautus kaikissa db-funktioissa
- R1-T5b: `poistaAsiakas`-funktion `'hoitokaynit'`-typo (vaatii Supabase-skeemaverifioinnin FK-CASCADE:sta)
- R1-T5c: `tallennaRenderoijastaLomake`-funktion `otsikko`-dead-code-haara (tämä funktio mahdollisesti korvautuu A+B:ssä, joten jonossa-merkintä saattaa muuttua)
- R1-T5d: legacy-mittarisarakkeet (DB-migraatio sarakkeiden poistolle)
- R1-T6: Lomake-kansioiden yhdistäminen (`lomakkeen-osiot/` + `lomake/` → `lomake/`) — tämä mahdollisesti hoituu osana A+B-vaihetta jos vanhat osio-komponentit korvautuvat
- AsiakasHistoria.jsx + haeKaynit -ketju (kuollut komponentti, vaatii käyttöpäätöksen)

---

## Milloin AB-vaihe päättyy

AB on valmis kun:
- Kaikki AB1-AB8 ovat tehty
- Sovellus toimii uudella yhdistetyllä lomakemallilla
- Vanhat A- ja B-komponentit on poistettu tai korvattu
- Build menee läpi ja testit vihreänä

Sen jälkeen:
- Palataan R1-loppuvaiheisiin (T4, T5b/c/d, T6) jos tarpeellisia uudessa kontekstissa
- Suunnitellaan seuraavat vaiheet (asiakasportaali, julkinen sivusto, oma ajanvaraus)

---

*Päivitetty: 2026-05-03 (alku)*
