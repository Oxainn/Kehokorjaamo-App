# Käyttöprosessi

> Tämä dokumentti kuvaa miten Kehokorjaamo-app toimii käyttäjän näkökulmasta — miten asiakas ja hoitaja käyttävät ohjelmaa eri tilanteissa. Päivitä kun prosessi muuttuu.

**Viimeisin päivitys:** 2026-04-29

---

## Perusperiaate

**Lomakkeen osiot 1–5 ovat aina asiakkaan tietoja** — asiakkaan itse antamia ja hänen vastuullaan. Lomake on aina sama riippumatta siitä missä se täytetään.

Kaksi täyttötilannetta:

1. **Asiakas täyttää itse sähköisesti** — kotona, puhelimella, ennen ajanvarausta
2. **Hoitaja kirjaa asiakkaan kertomana** — esim. iäkäs asiakas hoitohuoneessa, ei sähköpostia

Molemmissa lomakkeen lopussa on samat napit:

- **Tulosta PDF** — luo paperiversio (tulostettavaksi tai sähköisesti jaettavaksi)
- **Allekirjoitus ja lähetä** — tallentaa lomakkeen ja jatkaa eteenpäin

Mihin "lähetä" johtaa, riippuu kontekstista (alla).

---

## Lähetyksen vaikutukset — yhteenveto

Kun asiakas tai hoitaja painaa **"Allekirjoitus ja lähetä"**, tapahtuu kaksi asiaa aina:

1. **Lomake tallentuu Supabaseen**
2. **Lomake näkyy hoitajan asiakasrekisterissä uutena asiakkaana**

Lisäksi tilanteen mukaan:

| Tilanne | Tallennus | Vello-ohjaus | Portaalitiedot popupina |
|---------|-----------|--------------|------------------------|
| Asiakas täyttää itse, uusi asiakas | ✅ | ✅ Automaattinen | ✅ Automaattinen |
| Asiakas täyttää itse, jatkokäynti | ✅ (päivitys) | ✅ Automaattinen | ❌ |
| Hoitaja kirjaa, uusi asiakas | ✅ | ❌ | ❌ (lähetetään myöhemmin tarvittaessa) |

---

## Asiakkaan polku — ensimmäinen käynti (uusi asiakas)

1. Asiakas vierailee hoitajan sivustolla → klikkaa **"Varaa aika"**
2. Ohjautuu lomakkeelle (osiot 1–5):
   - Asiakastiedot
   - Sairaudet ja terveys
   - Hoitoon tulon syy
   - Asiakkaan kehonkartta
   - Suostumukset + allekirjoitus
3. Painaa **"Allekirjoitus ja lähetä"**
4. **Lomake tallentuu Supabaseen → näkyy hoitajan asiakasrekisterissä uutena asiakkaana**
5. **Automaattinen ohjaus Velloon** ajan varaamiseksi (linkki hoitajan tiedoissa)
6. **Popup:** kirjautumistiedot asiakasportaaliin

## Asiakkaan polku — jatkokäynti (olemassa oleva asiakas)

1. Asiakas: "Varaa aika" sivustolla TAI kirjautuu suoraan portaaliin
2. **Tunnistautuu** (sähköposti + portaalikirjautuminen)
3. Lomake näyttää **olemassa olevat tiedot** → voi tarkistaa ja päivittää muutokset
4. **Ei vaadita uudestaan:**
   - GDPR-suostumus
   - Allekirjoitus
5. "Allekirjoitus ja lähetä" → tiedot päivittyvät asiakkaan kortille → Vello

## Hoitaja kirjaa asiakkaan tiedot itse

Tilanteet: kotihoitokäynnit, iäkkäät asiakkaat ilman sähköpostia, yleisötapahtumat.

**HUOM:** Hoitaja ei "täytä asiakkaan puolesta" vaan **kirjaa muistiin** asiakkaan kertomana.

1. Hoitaja avaa "Uusi asiakas" asiakasrekisterissä
2. Käy lomakkeen läpi yhdessä asiakkaan kanssa, kirjaa asiakkaan vastaukset
3. **Allekirjoitus pyydetään hoitokäynnillä** (paperisesta lomakkeesta tutulla tavalla)
4. Painaa "Allekirjoitus ja lähetä" → lomake tallentuu asiakasrekisteriin uutena asiakkaana (ei Vello-ohjausta)
5. Sähköposti suositeltu mutta ei pakollinen

---

## Allekirjoituksen ja GDPR:n logiikka

| Tilanne | GDPR-suostumus | Allekirjoitus |
|---------|----------------|---------------|
| Uusi asiakas (asiakas itse) | ✅ Pakollinen | ✅ Pakollinen |
| Uusi asiakas (hoitaja kirjaa) | ✅ Pakollinen | ✅ Pyydetään hoitokäynnillä |
| Jatkokäynti (olemassa oleva) | ❌ Ei pyydetä uudestaan | ❌ Ei pyydetä uudestaan |

Sama periaate kuin nykyisessä paperilomakkeessa.

---

## Suostumusten näyttäminen jatkokäynneillä

Vaikka GDPR ja allekirjoitus eivät vaadita uudestaan, **olemassa olevien tietojen näkyminen on tärkeää:**

- Jatkokäynnin lomakkeessa osio 5 näyttää tiedoksi: "Suostumukset annettu [päiväys]"
- Asiakas voi tarvittaessa antaa allekirjoituksen uudestaan jos haluaa
- Hoitaja näkee asiakkaan kortilla milloin alkuperäinen suostumus on annettu

---

## Tietojen tarkistus ennen hoitoa

ROADMAPin alkuperäisestä linjauksesta poiketen: lomaketta **ei täytetä joka kerralla snapshotina**. Sen sijaan:

- Asiakkaalla on **yksi elävä profiili** joka päivittyy hoitoketjun aikana
- Asiakas päivittää tietoja portaalissa ennen seuraavaa käyntiä jos jotain on muuttunut
- Hoitaja näkee tarkistettavat muutokset (TODO: muutoshistoria)
- Aiemmat hoitokerrat tallentavat oman snapshotin sen hetkisistä tiedoista (vertailukelpoisuus säilyy)

Tämä on **muutos ROADMAPin alkuperäiseen "lomake on osa hoitokertaa, snapshot per käynti" -ajatukseen.** Päätös tehty 2026-04-29.

Vertailukelpoisuus säilyy koska hoitokerta-snapshot otetaan automaattisesti hoitokertaan tallennushetkellä.

---

## Asiakasportaali (vaihe 5 ROADMAPissa)

Asiakas voi portaalissa:
- Tarkistaa ja päivittää omat tietonsa
- Varata jatkohoitoja ilman uutta lomaketta
- Päivittää oiretilannetta hoitajan tietoon
- Saada hoitotuloksia ja itsehoito-ohjeita
- Nähdä hoitohistorian

Kirjautuminen: passwordless (sähköpostilinkki).

---

## Lomakkeen tilat sovelluksessa

| Konteksti | Kuka täyttää | Mihin "Lähetä" johtaa |
|-----------|--------------|----------------------|
| Vaihe 1 nyt (hoitaja kirjaa) | Hoitaja kirjaa asiakkaan kertomana | Tallennus asiakasrekisteriin |
| Vaihe 4 (sähköinen) | Asiakas itse | Tallennus + Vello-ajanvaraus + portaalitiedot |
| Vaihe 5 (portaali) | Asiakas itse | Tallennus + Vello-ajanvaraus |
