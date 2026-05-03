# REFAKTOROINTI — R1 käynnissä

> 🛑 **FREEZE ON.** Uusia ominaisuuksia EI lisätä. Vain R1-vaiheen refaktorointi sallittu.
> 
> Tämä paperi sitoo kaikkia: Code-istunnot, Cowork-istunnot, Oxa, ja kaikki Claude-instanssit.
>
> Aloitettu: 2026-05-03

---

## Miksi freeze

Auditointi 3.5.2026 totesi:
- 25 671 riviä koodia, **0 testitiedostoa**
- 405 committia 7 päivässä — laatu ei ehdi mukaan
- `db.js` 1 834 riviä, 63 funktiota, 0 try/catch, sekoittavat return-tyypit
- `KehitysJaLaadunvalvonta.jsx` 1 571 riviä, 35 useStatea
- Hardcoded `oxainn@gmail.com` 7 paikassa → multi-tenant ei valmis
- Rinnakkaiset kansiorakenteet `lomakkeen-osiot/` + `lomake/` (kesken jäänyt refaktorointi)
- Kuollutta rikkinäistä koodia (esim. `'hoitokaynit'`-typo db.js:ssä)

Eilinen havainto "muutokset rikkoivat paljon" ei ollut sattuma — se oli ennustettava lopputulos rakenteesta.

Tavoite: alustatuote (vaihe 10 roadmapissa) edellyttää tukevampaa pohjaa kuin nyt on.

---

## R1-vaiheen sisältö (2–3 viikkoa)

| # | Tehtävä | Status |
|---|---|---|
| 0 | REFAKTOROINTI.md (tämä paperi) | ✅ |
| 1 | Vitest + React Testing Library asennus | ⬜ |
| 2 | Testit 5 kriittiselle polulle (ks. alla) | ⬜ |
| 3 | `db.js` jaetaan moduuleihin | ⬜ |
| 4 | try/catch + yhtenäinen `{ data, virhe }` -palautus kaikissa db-funktioissa | ⬜ |
| 5 | Kuolleen koodin siivous (`hoitokaynit`-typo, ei-kutsutut funktiot) | ⬜ |
| 6 | Lomake-kansioiden yhdistäminen (`lomakkeen-osiot/` → `lomake/`) | ⬜ |

**Kriittiset polut joille testit kirjoitetaan ENNEN db.js:n koskettamista:**
- `tallennaAsiakas`
- `aloitaUusiKaynti`
- `tallennaHoitokirjaus`
- `tallennaRenderoijastaLomake`
- Auth-kirjautuminen (Google → session)

R1 on valmis kun kaikki yllä on tehty JA build menee läpi JA kaikki testit menevät vihreänä.

---

## Mikä on SALLITTUA

✅ Refaktorointi joka EI lisää uutta toiminnallisuutta — koodin siirtely, jakaminen, nimeäminen, virheenkäsittelyn yhtenäistäminen, kommentointi  
✅ Testien kirjoittaminen olemassa olevalle koodille  
✅ Kuolleen koodin poistaminen kun on todistettu ettei sitä kutsuta  
✅ Riippuvuuksien päivittäminen jos refaktorointi sitä vaatii  
✅ Tuotantokriittiset bugikorjaukset (= sovellus ei toimi lainkaan ilman korjausta) — keskustele Oxan kanssa ennen, dokumentoi commit-viestissä `[KIIRE-BUG-FIX]` -tagi

---

## Mikä ON KIELLETTYÄ

❌ Uusia ominaisuuksia (ei roadmapilta, ei jonossa olevista pikkukorjauksista, ei spontaaneista ideoista)  
❌ UI-paranteluja jotka eivät korjaa rikkinäistä toiminnallisuutta  
❌ "Pieniä lisäyksiä matkan varrella" — kaikki lisäykset menevät jonoon ja toteutetaan R3:n yhteydessä tai R4:ssä  
❌ Uudet riippuvuudet ilman keskustelua  
❌ Useita irrallisia muutoksia samassa committissa — yksi commit = yksi looginen muutos  
❌ Push ilman että `npm run build` menee läpi paikallisesti  
❌ Push ilman että uudet/muutetut testit menevät vihreänä  

---

## Säännöt AI-istunnoille (Code, Cowork, kaikki Claude-istunnot)

Joka istunnon alussa:
1. **LUE TÄMÄ TIEDOSTO ENSIMMÄISENÄ** ennen kuin teet mitään muuta
2. Tarkista että toimeksianto kuuluu R1:n piiriin (yllä oleva taulukko)
3. Jos toimeksianto ei kuulu R1:een → kysy Oxalta tai pysähdy
4. Jos epäselvyyttä → kysy, älä arvaa

Commit-viestien tagit R1:n aikana:
- `[R1-T1]` testikehyksen asennus
- `[R1-T2]` testin lisäys kriittiselle polulle
- `[R1-T3]` db.js-moduulin irrotus
- `[R1-T4]` virheenkäsittely
- `[R1-T5]` kuollut koodi pois
- `[R1-T6]` lomake-kansiot
- `[KIIRE-BUG-FIX]` tuotantokriittinen bugi (poikkeustapaus, dokumentoi miksi)

Tahti: enintään **5 committia päivässä**, tähtäin **2–3 hyvin testattua committia**. Hidas on uusi nopea — eilinen 58/päivä on root cause.

---

## Mikä jää jonoon R1:n ajaksi

Nämä eivät katoa, ne menevät R3-vaiheen yhteyteen kun komponentteja siivotaan kuitenkin:

- Lisätiedot: `kehonkartta_piirros` näytä KUVANA
- KA4: pisteen siirto kosketuksella tabletilla
- A-lomake kehonkartta: visuaalinen rinki-palaute kosketusviiveelle
- `VITE_LIVE_ANON_KEY` myös päätuotantoprojektiin
- `productboardClient` stub-fallback
- Muut jonossa olleet pikkukorjaukset

Lista on tallessa Productboard → TODO -näkymässä.

---

## Milloin freeze päättyy

R1 valmis → siirrytään R2:een (multi-tenant-pohja). R2 ei ole vielä freeze, mutta jatkaa hidasta tahtia samalla periaatteella: testit ensin, refaktorointi sitten, ominaisuudet vasta R4:ssä.

R1:n valmistumispäivämäärä päivitetään tähän tiedostoon kun se tapahtuu.

---

*Päivitetty: 2026-05-03 (alku)*
