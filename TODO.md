# Kehokorjaamo App — TO-DO

Tähän kerätään tehtäviä joita ei tehdä heti, mutta jotka pitää muistaa. 
Vaiheen mukainen lista, lisätään / poistetaan vapaasti.

## Vaihe 1 — Asiakastietolomake osiot 1–5

### Osio 3 — Hoitoon tulon syy
- [ ] Vanhempi-komponentti joka kytkee Osio3HoitoonTulonSyy:n Supabaseen 
      (tehdään kun lomakkeen runko rakennetaan)
- [ ] LocalStorage-draft-suoja kesken kirjoittamiselle 
      (tärkeämpi vaiheessa 4 kun asiakas täyttää itse)
- [ ] Pakollisuus-validointi: estä siirtyminen / lähetys jos kuvaus tyhjä

### Yleinen
- [ ] Lomakkeen runko-komponentti joka näyttää osiot 1–5 yhdessä
- [ ] Pyyhkäisy + nuolinapit -navigointi
- [ ] Osio-pisteet ylhäällä, klikkaus hyppää osioon
- [ ] Autosave-logiikka osionvaihdossa (yhteinen kaikille tekstikentille)

## Vaihe 3 — Asetukset (myöhemmin)

Periaate: kaikki muokkaukset pitää voida tehdä itse sovelluksesta, 
ei koodimuutoksilla. Tämä on ehto kaupallista versiota varten.

### Kehonkartan kalibrointi → Supabase-tallennus
- [ ] Luo Supabase-taulu kehon_vyohykkeet (hoitaja_id, id, nimi, tekninen, 
      puoli, cx, cy)
- [ ] RLS: hoitaja näkee vain omat vyöhykkeensä
- [ ] Hook useKehonVyohykkeet() lukee Supabasesta
- [ ] Kalibrointityökalulle Tallenna-nappi (tallentaa Supabaseen)
- [ ] Automaattinen default-täyttö ensimmäisellä käyttökerralla 
      (kovakoodattu fallback-lista)
- [ ] Migraatio: nykyiset 76 koodista tietokantaan
- [ ] Poista kovakoodatut koordinaatit src/data/kehonVyohykkeet.js:stä 
      kun migraatio toimii

### Sairauslistan muokkaus
- [ ] Asetukset → Sairauslista → lisää/muokkaa/poista sairauksia
      (pohja jo olemassa data/sairaudet-rakenteessa)

### Palvelukohtainen lomake-konfiguraatio
- [ ] Mitkä osiot näytetään milläkin palvelulla
- [ ] Mitkä vyöhykkeet näytetään milläkin palvelulla

### Hoitajaprofiili
- [ ] Asetukset → Profiili (nimi, esittely, kuva, koulutukset)
- [ ] Käytetään julkisella sivustolla (vaihe 6)
