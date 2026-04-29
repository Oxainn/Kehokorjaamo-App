# Osio 6 — Hoitajan havainnot ja löydökset (suunnittelumateriaali)

> Tämä on suunnittelumateriaalia myöhempää käyttöä varten. Osio 6 toteutetaan ROADMAPin Vaiheessa 2 (osiot 6–8). Tämä dokumentti talteen jotta tieto ei katoa.

---

## Yhteys osioon 4

Osio 4 (asiakkaan kehonkartta) ja osio 6 (hoitajan havainnot) **käyttävät samaa vyöhykerakennetta** (`src/data/kehonVyohykkeet.js`). Tämä mahdollistaa rakenteellisen vertailun:

- Mihin asiakas tuntee oireita VS. mistä hoitaja löytää poikkeamia
- Hiljaiset jännitykset (asiakas ei tunne, hoitaja löytää)
- Hoidon vaikutukset käyntien välillä (sama vyöhyke kerta toisensa jälkeen)

---

## Osio 6:n kaksi osaa

### Osa A — Vyöhykepohjaiset havainnot
Sama 76 vyöhykettä kuin asiakkaalla, mutta hoitajan oirelistalla:
- Jännitys
- Arkuus / palpaatiokipu
- Liikerajoitus
- Lihasheikkous
- Kireä lihas / faskia
- Niveleen liittyvä löydös

(Tarkka oirelista päätetään myöhemmin.)

### Osa B — Numeeriset linjausmittaukset
Liukusäätimet joilla hoitaja kirjaa kehon poikkeamat normaaliasennosta. Tämä mahdollistaa **numeerisen vertailukelpoisuuden** käyntien välillä.

---

## Linjausmittarit-taulukko

| Mitattava | Yksikkö | Normaaliarvo | UI-ehdotus |
|-----------|---------|--------------|------------|
| Lantion kallistuskulma (anterior/posterior tilt) | astetta | M: 4–7°, N: 7–10° | Liukusäädin -10°…+20° |
| Lantion sivuttainen kallistus (lateral tilt) | astetta tai cm | 0 (tasainen) | Liukusäädin -10°…+10° |
| Lantion kierto (pelvic rotation) | astetta | 0 (tasainen) | Liukusäädin -15°…+15° |
| Lantion siirtymä (pelvic sway eteen) | cm | 0 | Liukusäädin 0…10 cm |
| Olkapäiden korkeusero | cm | 0 | Liukusäädin -3…+3 cm |
| Olkapään eteen työntyminen vasen (protraction) | cm tai aste | 0 | Liukusäädin |
| Olkapään eteen työntyminen oikea (protraction) | cm tai aste | 0 | Liukusäädin |
| Pään eteen työntyminen (forward head posture) | cm | 0 | Liukusäädin 0…10 cm |
| Q-kulma vasen | astetta | M: ~14°, N: ~17° | Liukusäädin |
| Q-kulma oikea | astetta | M: ~14°, N: ~17° | Liukusäädin |
| Skolioosin kierto (Adam's bend / skoliometri) | astetta | 0 | Liukusäädin 0…20° |
| Navicular drop vasen | mm | < 10 mm | Liukusäädin |
| Navicular drop oikea | mm | < 10 mm | Liukusäädin |
| Akillesjänteen kulma vasen | astetta | suora | Liukusäädin |
| Akillesjänteen kulma oikea | astetta | suora | Liukusäädin |

---

## Anatominen taustateksti (lähde)

### Painovoimalinja (Plumb Line)

Perusmittaus, jossa katsotaan miten kehon osat asettuvat suhteessa luotisuoraan linjaan.

**Sivunäkymä:** Linjan tulisi kulkea korvalehden, olkapään kärjen (acromion), lantiokunnan keskipisteen, polven keskiosan ja ulkokehräsen etupuolen kautta.

**Taka- ja etunäkymä:** Linjan tulisi halkaista keho kahteen symmetriseen puolikkaaseen.

### Kulmamittaukset (Goniometria)

- **Lantion kallistuskulma:** ASIS ja PSIS välistä suhdetta. Normaali kallistus eteenpäin: M 4–7°, N 7–10°.
- **Q-kulma:** Reiden linjaus suhteessa polvilumpioon. Liian suuri = pihtipolvisuus (valgus).
- **Niskan eteenpäin asento:** C7 ja korvan välinen kulma.

### Symmetria ja tasot

- Olkapäiden korkeustaso (cm-eroina)
- Suoliluun harjanteiden taso (crista iliaca)
- Skolioosi: Adam's forward bend + skoliometri

### Jalkaterän linjaus

- **Navicular drop:** veneluun korkeusmuutos lepo vs. paino jalalla. Paljastaa ylipronaation.
- **Akillesjänteen kulma:** kantaluun asento sääreen nähden.

---

## Lantion linjavirheet (5 päätyyppiä)

### 1. Eteenpäin kallistus (Anterior Pelvic Tilt)
- Lantion etu laskee, taka nousee
- Alaselän notko (lordoosi) korostuu, vatsa eteen, takapuoli taakse ("ankka-asento")
- Aiheuttaa alaselkäkipua, lonkankoukistajien kireyttä, pakaroiden ja syvien vatsalihasten heikkoutta
- Mittausarvo: kallistuskulma yli 10°

### 2. Taaksepäin kallistus (Posterior Pelvic Tilt)
- Lantion etu nousee, taka laskee
- Alaselkä litteä, häntäluu "koipien välissä", polvet usein hieman koukussa
- Lisää painetta välilevyille, voi aiheuttaa niska-hartiaongelmia (yläselkä pyöristyy)

### 3. Sivuttainen kallistus (Lateral Pelvic Tilt)
- Toinen puoli korkeammalla kuin toinen
- Suoliluun harjut eivät samalla tasolla
- Syyt: raajapituusero, toispuoleinen lihaskireys (esim. QL), skolioosi
- Aiheuttaa kipua korkeamman puolen lonkassa tai vastakkaisen puolen polvessa/nilkassa

### 4. Kierto (Pelvic Rotation)
- Pystyakselin ympäri kiertynyt — toinen ASIS-kärki edempänä
- Varpaat eri suuntiin, käsi heilahtaa epäsymmetrisesti kävellessä
- Kiertää selkärangan alaosaa ja SI-niveliä → krooninen säteilykipu, hermopinne

### 5. Siirtymä (Pelvic Sway / Swayback)
- Lantio siirtyy eteenpäin nilkkoihin nähden
- Yhdistyy usein taaksepäin kallistukseen ja yläselän pyöristymiseen
- Painopiste vahvasti kantapäillä, lantio "roikkuu" nivelsiteiden varassa

---

## Hartialinjan poikkeamat (5 päätyyppiä)

### 1. Eteenpäin työntyneet hartiat (Protracted Shoulders)
- Yleisin, "päätetyöasento"
- Olkapäät sisäänpäin, rintakehä kasaan, kämmenet seistessä taaksepäin
- Rintalihakset kireät, lavanlähentäjät venyneet ja heikot
- Aiheuttaa jännityspäänsärkyä
- Mittaus: korvalehti ja olkapään kärki samalla pystysuoralla linjalla?

### 2. Koholla olevat hartiat (Elevated Shoulders)
- Hartiat lähellä korvia, molemmin tai toispuoleisesti
- "Kaulattomuuden" tunne, trapezius kireä
- Syyt: stressi, staattinen jännitys, huono ergonomia
- Vaikutukset: purentaongelmat, jäykkyys, yläraajojen puutuminen

### 3. Toispuoleinen hartialinja (Uneven Shoulders)
- Toinen olkapää korkeammalla
- Paidan kaula-aukko valuu, käsi näyttää pidemmältä
- Syyt: lantion sivukallistus, toispuoleinen laukunkanto, skolioosi
- Aiheuttaa epätasaista kuormitusta selkärangalle

### 4. Siirrotuslapa (Winged Scapula)
- Lapaluun sisäreuna tai alakulma irti rintakehästä
- Syyt: sahalihaksen heikkous, hermotushäiriö
- Olkapään epävakaus, vaikeus nostaa kättä suoraan ylös

### 5. Pään eteenpäin asento (Forward Head Posture)
- Leuka eteen rintalastaan nähden ("korppikotka-asento")
- Jokainen sentti eteen → niskan kuorma moninkertaistuu
- Vetää hartioita kasaan

---

## Ydinajatus jäsenkorjauksen näkökulmasta

> "Lantion virheasento on keskiössä ja usein aiheuttaa poikkeamaa koko kehossa. Ongelman lähde voi tosin olla myös jalkaterän tai polven virheellisessä asennossa. Ongelman aiheuttajan selvittäminen on usein hankalaa, siksi esim. Kalevalaisessa jäsenkorjauksessa hoidetaan aina koko kehoa jalkaterästä päälakeen, nivelien oikeaa liikettä palauttamalla, poistamalla kudostainetta, parantamalla lihasten ja kalvojen aineenvaihduntaa ja elastisuutta."

---

*Päivitetty: 2026-04-29*
