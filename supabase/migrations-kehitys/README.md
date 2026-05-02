# Kehitys-DB:n alustus-skriptit

Tämä kansio sisältää SQL-skriptit jotka pitää ajaa **käsin** Kehitys-DB:hen
(`Kehokorjaamo-Kehitys` Supabase-projekti) sen jälkeen kun olet rekisteröitynyt
sinne. Erillään tavallisista `supabase/migrations/`-kansion migraatioista koska
nämä eivät ole automaattisesti ajettavissa — niissä on `__OXAN_KEHITYS_HOITAJA_ID__`
-placeholdereita jotka tarvitsevat sinun Kehitys-tilisi UUID:n.

## Miksi erillään?

Lomakepohjat, kenttäkirjasto ja palvelut ovat hoitaja-spesifejä (FK
`auth.users(id)`), eikä Live-DB:n hoitaja-rivit toimi Kehitys-DB:ssä koska
auth.users-taulut ovat erilliset. Tämä tarkoittaa että nämä taulut pitää
alustaa Kehitys-DB:hen sinun Kehitys-tilisi UUID:llä.

## Käyttöohje

1. Rekisteröidy Kehokorjaamo-Kehitykseen (kehokorjaamo-kehitys.vercel.app)
   sähköpostilla `oxainn@gmail.com`
2. Kirjaudu Supabase-dashboardiin, mene Kehokorjaamo-Kehitys → Authentication → Users
3. Kopioi oma user_id (UUID) — esim. `12345678-90ab-cdef-1234-567890abcdef`
4. Avaa kukin SQL-skripti (esim. `01_lomakepohjat_alku.sql`) ja tee
   Find/Replace: `__OXAN_KEHITYS_HOITAJA_ID__` → kopioimasi UUID
5. Aja korjattu skripti Supabase SQL Editorissa (Kehokorjaamo-Kehitys → SQL Editor)
6. Tarkista onnistuminen tiedoston lopussa olevalla SELECT-kyselyllä

## Skriptit

- `01_lomakepohjat_alku.sql` — 5 lomakepohjaa, 9 versiota, 22 kenttäkirjasto-merkintää, 22 käännöstä
