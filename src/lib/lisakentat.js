// Lisäkenttien (lomakeversio.lisakentat-jsonbin) renderöintiapurit.
//
// kehonkartta_piirros, allekirjoitus jne. tallentuvat base64-kuvina
// objektin sisään tai suorina dataURL-merkkijonoina. Aiemmin Lisätiedot-
// osio teki JSON.stringify → käyttäjä näki raakatekstiä ruudulla.

// Yritä poimia base64-kuvadataURL eri muodoista:
//   - "data:image/png;base64,..."        → arvo itse
//   - { kuva: "data:image/...", ... }    → arvo.kuva (kehonkartta_piirros)
//   - { url: "data:image/...", ... }     → arvo.url
// Palauttaa dataURL-merkkijonon tai null jos ei kuvaa.
export function poimiKuvaUrl(arvo) {
  if (typeof arvo === 'string' && arvo.startsWith('data:image/')) return arvo
  if (arvo && typeof arvo === 'object') {
    if (typeof arvo.kuva === 'string' && arvo.kuva.startsWith('data:image/')) return arvo.kuva
    if (typeof arvo.url === 'string' && arvo.url.startsWith('data:image/'))   return arvo.url
  }
  return null
}
