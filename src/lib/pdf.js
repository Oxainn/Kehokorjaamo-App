// Hoitokertomuksen PDF-generointi.
// Kaksi tilaa:
//   1. Käyntiraportti — yksittäinen käynti (tilattu KayntiNakyma:sta)
//   2. Tietopaketti (GDPR) — kaikki asiakkaan käynnit + saateteksti
//
// Käyttää html2pdf.js:ää joka yhdistää html2canvas + jspdf. Rakennetaan
// HTML-elementti DOM:iin, muunnetaan ja siivotaan.
//
// Pala B7: PDF laajennettu B-lomakkeen tiedoilla:
//   - Hoitajan havainnot (BodyMap-merkinnät ryhmiteltynä alueittain)
//   - Mittaustulokset (15 mittaria + vertailu edelliseen)
//   - Hoitoraportti (alkutilanne, hoidon kulku, "muista ensi kerralla"
//     vain hoitajan tulostuksissa, jätetään pois GDPR-tietopaketista)
//   - Itsehoito-ohjelma (B6, jo olemassa)
//   - Jatkohoitosuunnitelma (seuraava käynti, sarjan tila, kommentti)

import html2pdf from 'html2pdf.js'
import { muotoilePvm } from './muotoilu'
import { KIRJAUSRAKENNE } from '../data/findings-structure'
import { MITTARIT } from '../data/linjausmittarit'
import { laskeMuutos, muotoileDelta } from './mittaukset'

// Hoitavan toimijan tiedot — kovakoodattu toistaiseksi yhden hoitajan
// käyttöön. Multi-tenant-vaiheessa (Vaihe G) luetaan hoitaja-tiedoista
// auth.users-taulun metadatasta tai erillisestä terapeutti-taulusta.
const HOITAJA = {
  yritys:   'Kalevalapaja',
  nimi:     'Axel Oxain (Jari Tossavainen)',
  titteli:  'Kalevalainen jäsenkorjaaja, hieroja',
  yTunnus:  '',
  osoite:   '',
  puhelin:  '',
  email:    'oxainn@gmail.com',
}

const TYYLIT = `
  <style>
    .pdf-juuri {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #111827;
      line-height: 1.5;
      font-size: 11pt;
      padding: 24px;
      max-width: 720px;
    }
    .pdf-juuri h1 {
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 8px;
      color: #111827;
    }
    .pdf-juuri h2 {
      font-size: 13pt;
      font-weight: 700;
      margin: 20px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e5e7eb;
      color: #1f2937;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .pdf-juuri h3 {
      font-size: 11pt;
      font-weight: 700;
      margin: 12px 0 4px;
      color: #374151;
    }
    .pdf-juuri h4 {
      font-size: 10.5pt;
      font-weight: 600;
      margin: 10px 0 2px;
      color: #4b5563;
    }
    .pdf-juuri p { margin: 4px 0; }
    .pdf-juuri ul { margin: 4px 0 8px 18px; padding: 0; }
    .pdf-juuri li { margin: 2px 0; }
    .pdf-juuri .meta { font-size: 10pt; color: #6b7280; margin-bottom: 16px; }
    .pdf-juuri .saate {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 0 0 24px;
      font-size: 10.5pt;
    }
    .pdf-juuri .saate h2 {
      border: none;
      margin-top: 0;
      color: #065f46;
      text-transform: none;
      font-size: 14pt;
    }
    .pdf-juuri table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
    }
    .pdf-juuri td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 10.5pt;
    }
    .pdf-juuri td.label {
      color: #6b7280;
      width: 35%;
      white-space: nowrap;
    }
    .pdf-juuri .kaynti {
      margin: 16px 0;
      padding: 12px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .pdf-juuri .kaynti-otsikko {
      font-weight: 700;
      font-size: 12pt;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .pdf-juuri .havainto-alue {
      margin: 6px 0;
      page-break-inside: avoid;
    }
    .pdf-juuri .havainto-alue strong {
      color: #1f2937;
    }
    .pdf-juuri table.mittaukset {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .pdf-juuri table.mittaukset thead td {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 10pt;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    .pdf-juuri table.mittaukset tbody td {
      border-bottom: 1px solid #f3f4f6;
      font-size: 10.5pt;
    }
    .pdf-juuri table.mittaukset td.muutos-parannus { color: #065f46; font-weight: 600; }
    .pdf-juuri table.mittaukset td.muutos-heikennys { color: #991b1b; font-weight: 600; }
    .pdf-juuri table.mittaukset td.muutos-ennallaan { color: #6b7280; }
    .pdf-juuri .tekstilohko {
      margin: 8px 0;
      padding: 8px 12px;
      background: #ffffff;
      border-left: 3px solid #d1d5db;
      border-radius: 4px;
      white-space: pre-wrap;
      font-size: 10.5pt;
      page-break-inside: avoid;
    }
    .pdf-juuri .muista-lohko {
      border-left-color: #fcd34d;
      background: #fffbeb;
    }
    .pdf-juuri .jatko-rivi {
      margin: 4px 0;
      font-size: 10.5pt;
    }
    .pdf-juuri .jatko-tieto {
      color: #6b7280;
      font-style: italic;
    }
    .pdf-juuri .allekirjoitus img {
      max-width: 280px;
      max-height: 100px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px;
      background: #fafafa;
      display: block;
      margin-top: 6px;
    }
    .pdf-juuri .alarivi {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.4;
    }
    .pdf-juuri .uusi-sivu { page-break-before: always; }
  </style>
`

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function muotoileSyntyma(iso) {
  return muotoilePvm(iso, '')
}

function rivi(label, arvo) {
  if (arvo === null || arvo === undefined || arvo === '') return ''
  return `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(arvo)}</td></tr>`
}

function rakennaSaate(asiakkaanNimi) {
  const tanaan = new Date().toLocaleDateString('fi-FI')
  return `
    <div class="saate">
      <h2>Tietopaketti — sinun tietosi Kehokorjaamossa</h2>
      <p class="meta">Päivätty: ${escapeHtml(tanaan)}</p>
      <p>Tämä asiakirja sisältää kaikki sinusta tallennetut tiedot
      <strong>${escapeHtml(HOITAJA.nimi)}</strong>:n hoidossa. Sinulla on oikeus
      näihin tietoihin EU:n tietosuoja-asetuksen (GDPR) art. 15 mukaisesti.</p>
      <p style="margin-top: 8px;"><strong>Mitä tässä on:</strong></p>
      <ul>
        <li>Yhteystietosi ja perustietosi</li>
        <li>Antamasi terveyshistoria</li>
        <li>Allekirjoittamasi suostumukset</li>
        <li>Yhteenveto kaikista hoitokerroistasi</li>
      </ul>
    </div>
  `
}

function rakennaHoitajaOsio() {
  const osat = [
    HOITAJA.yritys,
    HOITAJA.nimi,
    HOITAJA.titteli,
  ].filter(Boolean)
  const yht = [
    HOITAJA.yTunnus  ? `Y-tunnus: ${HOITAJA.yTunnus}`  : '',
    HOITAJA.osoite,
    HOITAJA.puhelin  ? `Puh. ${HOITAJA.puhelin}` : '',
    HOITAJA.email,
  ].filter(Boolean).join(' · ')
  return `
    <h2>Hoitava toimija</h2>
    ${osat.map((s) => `<p>${escapeHtml(s)}</p>`).join('')}
    ${yht ? `<p class="meta">${escapeHtml(yht)}</p>` : ''}
  `
}

function rakennaAsiakasOsio(asiakas) {
  const osoite = [
    asiakas?.lahiosoite,
    [asiakas?.postinumero, asiakas?.postitoimipaikka].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
  return `
    <h2>Asiakas</h2>
    <p style="font-size: 12pt; font-weight: 600;">${escapeHtml(asiakas?.nimi || '(nimetön)')}</p>
    <table>
      ${rivi('Syntymäaika', muotoileSyntyma(asiakas?.syntymaaika))}
      ${rivi('Sähköposti', asiakas?.sahkoposti)}
      ${rivi('Puhelin', asiakas?.puhelin)}
      ${rivi('Osoite', osoite)}
      ${rivi('Ammatti', asiakas?.ammatti)}
    </table>
  `
}

// Pala B7 — Havainnot ryhmiteltyinä anatomisten alueiden alle.
// havainnot: havainnot-taulun rivit { voimakkuus, kuvaus, lisakentat:
//   { alueId, tyyppi, kirjaukset } }. Näytä vain alueet joista löytyi
//   havaintoja.
function rakennaHavainnotOsio(havainnot) {
  if (!havainnot || havainnot.length === 0) return ''
  // Indeksoi KIRJAUSRAKENNE id:llä
  const alueIndeksi = new Map(KIRJAUSRAKENNE.map((a) => [a.id, a]))

  const lohkot = havainnot.map((h) => {
    const alueId = h?.lisakentat?.alueId
    const alue = alueIndeksi.get(alueId)
    if (!alue) return ''
    const kirjaukset = h?.lisakentat?.kirjaukset ?? {}
    const kipu = h?.voimakkuus
    // Käytä KIRJAUSRAKENNE:n nimet (kallistus → "Kallistunut alaspäin")
    const rivit = []
    for (const k of alue.kirjaukset) {
      const arvo = kirjaukset[k.id]
      if (arvo === null || arvo === undefined || arvo === '') continue
      rivit.push(`<li>${escapeHtml(k.nimi)}: ${escapeHtml(arvo)}</li>`)
    }
    if (rivit.length === 0 && (kipu === null || kipu === undefined || kipu === 0)) return ''
    return `
      <div class="havainto-alue">
        <strong>${escapeHtml(alue.nimi)}:</strong>
        <ul>
          ${rivit.join('')}
          ${kipu ? `<li>Kipu: ${kipu} / 10</li>` : ''}
        </ul>
      </div>
    `
  }).filter(Boolean).join('')

  if (!lohkot) return ''
  return `
    <h3>Hoitajan havainnot</h3>
    ${lohkot}
  `
}

// Pala B7 — Mittaustaulukko: Mittari | Tämä käynti | Edellinen | Muutos.
// hoitokaynti: hoitokaynnit-rivi (sis. 15 mittarisaraketta)
// edellisetMittarit: { sarake: arvo } | null
function rakennaMittauksetOsio(hoitokaynti, edellisetMittarit) {
  if (!hoitokaynti) return ''
  const muotoileArvo = (arvo, yksikko) =>
    arvo === null || arvo === undefined ? '' :
    `${String(arvo).replace('.', ',')} ${yksikko}`

  const rivit = MITTARIT.map((m) => {
    const arvo = hoitokaynti[m.sarake]
    if (arvo === null || arvo === undefined) return ''
    const edell = edellisetMittarit?.[m.sarake] ?? null
    const muutos = laskeMuutos(arvo, edell, m.sarake)
    let muutosTeksti = ''
    let muutosLuokka = 'muutos-ennallaan'
    if (muutos) {
      muutosTeksti = muotoileDelta(muutos.delta, m.yksikko)
      if (muutos.parannus === 'parannus') {
        muutosLuokka = 'muutos-parannus'
        muutosTeksti += ' (parannus)'
      } else if (muutos.parannus === 'heikennys') {
        muutosLuokka = 'muutos-heikennys'
        muutosTeksti += ' (heikennys)'
      } else {
        muutosTeksti += ' (ennallaan)'
      }
    }
    return `
      <tr>
        <td>${escapeHtml(m.nimi)}</td>
        <td>${escapeHtml(muotoileArvo(arvo, m.yksikko))}</td>
        <td>${escapeHtml(edell !== null ? muotoileArvo(edell, m.yksikko) : '—')}</td>
        <td class="${muutosLuokka}">${escapeHtml(muutosTeksti || '—')}</td>
      </tr>
    `
  }).filter(Boolean).join('')

  if (!rivit) return ''
  return `
    <h3>Mittaustulokset</h3>
    <table class="mittaukset">
      <thead>
        <tr>
          <td style="width: 45%;">Mittari</td>
          <td style="width: 18%;">Tämä käynti</td>
          <td style="width: 17%;">Edellinen</td>
          <td style="width: 20%;">Muutos</td>
        </tr>
      </thead>
      <tbody>
        ${rivit}
      </tbody>
    </table>
  `
}

// Pala B7 — Hoitoraportti: kesto, alkutilanne, hoidon kulku, "muista
// ensi kerralla". naytaMuistaEnsiKerralla=false jättää pois Muista-tekstin
// (käytetään GDPR-tietopaketissa, hoitajan oma muistiinpano).
function rakennaHoitoraporttiOsio(hoitokaynti, naytaMuistaEnsiKerralla) {
  if (!hoitokaynti) return ''
  const lt = hoitokaynti.alkutilanne
  const hk = hoitokaynti.hoidon_kulku
  const me = hoitokaynti.muista_ensi_kerralla
  const ke = hoitokaynti.kesto_min

  if (!lt && !hk && (!naytaMuistaEnsiKerralla || !me) && !ke) return ''

  const ositkin = []
  if (ke) {
    ositkin.push(`<p class="jatko-rivi"><strong>Hoidon kesto:</strong> ${escapeHtml(ke)} min</p>`)
  }
  if (lt) {
    ositkin.push(`
      <h4>Hoidon alkutilanne</h4>
      <div class="tekstilohko">${escapeHtml(lt)}</div>
    `)
  }
  if (hk) {
    ositkin.push(`
      <h4>Hoidon kulku ja lopputulos</h4>
      <div class="tekstilohko">${escapeHtml(hk)}</div>
    `)
  }
  if (naytaMuistaEnsiKerralla && me) {
    ositkin.push(`
      <h4>Muista ensi kerralla</h4>
      <div class="tekstilohko muista-lohko">${escapeHtml(me)}</div>
    `)
  }
  return `
    <h3>Hoitoraportti</h3>
    ${ositkin.join('')}
  `
}

// Pala B7 — Jatkohoitosuunnitelma: seuraava käynti + sarjan tila +
// hoitajan kommentit.
function rakennaJatkohoitoOsio(hoitokaynti, kayntinumero, sarjanPituus) {
  if (!hoitokaynti) return ''
  const seur = hoitokaynti.seuraava_kaynti_pvm
  const kom  = hoitokaynti.hoitajan_kommentit
  if (!seur && !kom && kayntinumero == null) return ''

  let sarjaTeksti = ''
  if (kayntinumero != null) {
    if (sarjanPituus && kayntinumero > sarjanPituus) {
      sarjaTeksti = `Sarja päättynyt — ylläpitohoito (käynti ${kayntinumero})`
    } else if (sarjanPituus) {
      sarjaTeksti = `Käynti ${kayntinumero} / ${sarjanPituus}`
    } else {
      sarjaTeksti = `Käynti ${kayntinumero}`
    }
  }

  return `
    <h3>Jatkohoitosuunnitelma</h3>
    ${seur ? `<p class="jatko-rivi"><strong>Seuraava käynti:</strong> ${escapeHtml(muotoilePvm(seur))}</p>` : ''}
    ${sarjaTeksti ? `<p class="jatko-rivi"><strong>Sarjan tila:</strong> ${escapeHtml(sarjaTeksti)}</p>` : ''}
    ${kom ? `
      <h4>Hoitajan kommentti</h4>
      <div class="tekstilohko">${escapeHtml(kom)}</div>
    ` : ''}
  `
}

// Pala B7 — yhdistää A-lomakkeen tiedot + B-lomakkeen tiedot yhteen
// käyntilohkoon. naytaMuistaEnsiKerralla: false GDPR-tietopaketissa.
function rakennaKayntiOsio({
  versio,
  sairausNimet,
  otsikkoTeksti,
  hoitokaynti = null,
  havainnot = [],
  edellisetMittarit = null,
  itsehoitoValinnat = [],
  kayntinumero = null,
  sarjanPituus = null,
  naytaMuistaEnsiKerralla = true,
}) {
  const v = versio
  const allekirjoitus = v?.lisakentat?.allekirjoitus
  const onAllekirjoitusKuva = typeof allekirjoitus === 'string' && allekirjoitus.startsWith('data:image')

  return `
    <div class="kaynti">
      <p class="kaynti-otsikko">${escapeHtml(otsikkoTeksti)}</p>

      <h3>Asiakkaan kertomat tiedot</h3>
      <table>
        ${rivi('Hoitoon tulon syy', v?.hoitoon_syy)}
        ${v?.kipu_taso !== null && v?.kipu_taso !== undefined ? rivi('Kipuluku', `${v.kipu_taso} / 10`) : ''}
        ${rivi('Lääkitys', v?.laakitys)}
        ${rivi('Diagnosoidut sairaudet', v?.diagnosoidut_sairaudet)}
        ${rivi('Vammat ja huomiot', v?.vammat_huomiot)}
        ${rivi('Harrastukset', v?.harrastukset)}
        ${(sairausNimet?.length > 0) ? rivi('Sairaudet (rastittu)', sairausNimet.join(', ')) : ''}
      </table>

      ${rakennaHavainnotOsio(havainnot)}
      ${rakennaMittauksetOsio(hoitokaynti, edellisetMittarit)}
      ${rakennaHoitoraporttiOsio(hoitokaynti, naytaMuistaEnsiKerralla)}
      ${rakennaItsehoitoLohko(itsehoitoValinnat)}
      ${rakennaJatkohoitoOsio(hoitokaynti, kayntinumero, sarjanPituus)}

      ${onAllekirjoitusKuva ? `
        <h3>Allekirjoitus</h3>
        <div class="allekirjoitus">
          <img src="${escapeHtml(allekirjoitus)}" alt="Asiakkaan allekirjoitus" />
          <p class="meta" style="margin-top: 4px;">${escapeHtml(v.muokkaaja_rooli || '')} ${v.voimassa_alkaen ? '· ' + muotoilePvm(v.voimassa_alkaen) : ''}</p>
        </div>
      ` : ''}
    </div>
  `
}

// Pala B6: itsehoito-ohjelma -lohko käyntilohkon sisällä. Otsikko on h3
// (ei h2) jotta sopii käyntilohkoon. valinnat: [{ harjoitus,
// toistot_muokattu, frekvenssi_muokattu, lisahuomautus }]
function rakennaItsehoitoLohko(valinnat) {
  if (!valinnat || valinnat.length === 0) return ''
  const rivit = valinnat.map((v) => {
    const h = v.harjoitus
    if (!h) return ''
    const toistot = (v.toistot_muokattu ?? '').trim() || h.toistot || ''
    const frekvenssi = (v.frekvenssi_muokattu ?? '').trim() || h.frekvenssi || ''
    const meta = [
      h.kesto_min ? `${h.kesto_min} min` : '',
      toistot,
      frekvenssi,
    ].filter(Boolean).join(' · ')
    return `
      <div style="margin: 8px 0; padding: 10px 14px; background: #f0fdf4; border-left: 3px solid #1D9E75; border-radius: 4px; page-break-inside: avoid;">
        <p style="font-weight: 700; font-size: 11pt; margin: 0 0 4px; color: #065f46;">${escapeHtml(h.nimi)}</p>
        ${h.lyhyt_kuvaus ? `<p style="margin: 0 0 6px; font-size: 10.5pt; color: #374151;">${escapeHtml(h.lyhyt_kuvaus)}</p>` : ''}
        ${h.pitka_ohje ? `<p style="margin: 0 0 6px; font-size: 10pt; color: #1f2937; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(h.pitka_ohje)}</p>` : ''}
        ${meta ? `<p style="margin: 0 0 4px; font-size: 9.5pt; color: #4b5563;"><strong>Toteutus:</strong> ${escapeHtml(meta)}</p>` : ''}
        ${v.lisahuomautus ? `<p style="margin: 0 0 4px; font-size: 9.5pt; color: #4b5563;"><strong>Hoitajan huom.:</strong> ${escapeHtml(v.lisahuomautus)}</p>` : ''}
        ${h.varoitukset ? `<p style="margin: 4px 0 0; font-size: 9.5pt; color: #991b1b; background: #fef2f2; padding: 4px 8px; border-radius: 4px;">⚠ ${escapeHtml(h.varoitukset)}</p>` : ''}
      </div>
    `
  }).join('')
  return `
    <h3>Itsehoito-ohjelma</h3>
    ${rivit}
  `
}

function rakennaSuostumusOsio(asiakas) {
  const sailytys = asiakas?.suostumus_tietojen_sailytys === true
  const luovutus = asiakas?.suostumus_tietojen_luovutus === true
  if (!sailytys && !luovutus) return ''
  return `
    <h2>Suostumukset</h2>
    <p>Asiakas on antanut suostumuksen henkilötietojensa käsittelyyn
    hoitosuhteen toteuttamiseksi (EU:n yleinen tietosuoja-asetus,
    art. 6 ja 9).</p>
    ${sailytys ? '<p>✓ Hyväksynyt tietojen säilytyksen</p>' : ''}
    ${luovutus ? '<p>✓ Antanut luvan tietojen luovutukseen hoitoon osallistuville</p>' : ''}
  `
}

const ALARIVI = `
  <div class="alarivi">
    Tämä asiakirja sisältää terveystietoja — käsittele luottamuksellisesti.
  </div>
`

function tiedostonimiTurvallinen(nimi) {
  return (nimi || 'asiakas')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function tulostaPDF(html, tiedostonimi) {
  const container = document.createElement('div')
  container.className = 'pdf-juuri'
  container.innerHTML = TYYLIT + html
  // Pidetään näkymättömänä mutta DOM:issa, jotta html2canvas pystyy mittaamaan
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  document.body.appendChild(container)
  try {
    await html2pdf()
      .set({
        margin: [10, 12, 14, 12],          // mm: top, right, bottom, left
        filename: tiedostonimi,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // 'css' kunnioittaa page-break-before/inside-arvoja, 'legacy'
        // arvioi pituuden — yhdessä toimii sekä luonnollinen ylivuoto
        // että käyntien välinen pakotettu sivunvaihto (.uusi-sivu).
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(container)
      .save()
  } finally {
    document.body.removeChild(container)
  }
}

// Käyntiraportti yksittäisestä käynnistä — hoitajan tulostus, näyttää
// kaikki tiedot mukaan lukien "Muista ensi kerralla". Sopii myös asiakkaan
// haluamaksi käyntiraportiksi.
//
// Pala B7: laajennettu B-lomakkeen tiedoilla.
//   hoitokaynti:       hoitokaynnit-rivi (sis. mittarit, hoitoraportin)
//   havainnot:         havainnot-taulun rivit
//   edellisetMittarit: { sarake: arvo } | null
//   itsehoitoValinnat: B6 — käyntiin liitetyt itsehoitovalinnat
//   kayntinumero:      N (monesko käynti tämä on)
//   sarjanPituus:      M (palvelun hoitosarjan pituus)
export async function tulostaKaynti({
  asiakas,
  versio,
  sairaudet,
  hoitokaynti = null,
  havainnot = [],
  edellisetMittarit = null,
  itsehoitoValinnat = [],
  kayntinumero = null,
  sarjanPituus = null,
}) {
  const sairausNimet = (sairaudet ?? []).map((s) => s.nimi).filter(Boolean)
  const pvm = versio?.voimassa_alkaen ? muotoilePvm(versio.voimassa_alkaen) : ''
  const otsikkoTeksti = [
    pvm ? `Päivä: ${pvm}` : '',
    versio?.otsikko ? `Otsikko: ${versio.otsikko}` : '',
  ].filter(Boolean).join(' · ') || 'Hoitokerta'

  const html = `
    <h1>Hoitokertomus</h1>
    <p class="meta">Päivätty: ${escapeHtml(new Date().toLocaleDateString('fi-FI'))}</p>

    ${rakennaHoitajaOsio()}
    ${rakennaAsiakasOsio(asiakas)}

    <h2>Hoitokerta</h2>
    ${rakennaKayntiOsio({
      versio,
      sairausNimet,
      otsikkoTeksti,
      hoitokaynti,
      havainnot,
      edellisetMittarit,
      itsehoitoValinnat,
      kayntinumero,
      sarjanPituus,
      naytaMuistaEnsiKerralla: true,
    })}

    ${rakennaSuostumusOsio(asiakas)}
    ${ALARIVI}
  `

  const nimiOsa = tiedostonimiTurvallinen(asiakas?.nimi)
  const pvmOsa  = pvm.replace(/\./g, '-') || new Date().toISOString().slice(0, 10)
  await tulostaPDF(html, `hoitokertomus-${nimiOsa}-${pvmOsa}.pdf`)
}

// GDPR-tietopaketti — koko historia.
// Pala B7: jokaiselle käynnille mukana B-lomakkeen tiedot, mutta
// "Muista ensi kerralla" -teksti jätetään pois (hoitajan oma muistiinpano).
//
// kaynnit: lista uusin ensin, jokainen elementti:
//   { versio, sairaudet, hoitokaynti?, havainnot?, edellisetMittarit?,
//     itsehoitoValinnat?, kayntinumero? }
export async function tulostaTietopaketti({ asiakas, kaynnit, sarjanPituus = null }) {
  const tanaan = new Date().toLocaleDateString('fi-FI').replace(/\./g, '-')
  const kaynnitHtml = (kaynnit ?? []).map((k, indeksi) => {
    const sairausNimet = (k.sairaudet ?? []).map((s) => s.nimi).filter(Boolean)
    const pvm = k.versio?.voimassa_alkaen ? muotoilePvm(k.versio.voimassa_alkaen) : ''
    const otsikkoTeksti = [
      pvm ? `Päivä: ${pvm}` : '',
      k.versio?.otsikko ? `Otsikko: ${k.versio.otsikko}` : '',
    ].filter(Boolean).join(' · ') || 'Hoitokerta'
    // Ensimmäinen käynti samalle sivulle Asiakkaan ja Hoitavan toimijan
    // kanssa, sitä seuraavat käynnit alkavat omalta sivultaan jotta
    // pitkä historia pysyy luettavana.
    const wrapper = indeksi > 0 ? '<div class="uusi-sivu"></div>' : ''
    return wrapper + rakennaKayntiOsio({
      versio:            k.versio,
      sairausNimet,
      otsikkoTeksti,
      hoitokaynti:       k.hoitokaynti ?? null,
      havainnot:         k.havainnot ?? [],
      edellisetMittarit: k.edellisetMittarit ?? null,
      itsehoitoValinnat: k.itsehoitoValinnat ?? [],
      kayntinumero:      k.kayntinumero ?? null,
      sarjanPituus,
      // GDPR: hoitajan oma muistiinpano jätetään asiakkaan kopiosta pois.
      naytaMuistaEnsiKerralla: false,
    })
  }).join('')

  const html = `
    ${rakennaSaate(asiakas?.nimi)}

    <h1>Hoitokertomus</h1>
    <p class="meta">Päivätty: ${escapeHtml(new Date().toLocaleDateString('fi-FI'))}</p>

    ${rakennaHoitajaOsio()}
    ${rakennaAsiakasOsio(asiakas)}

    <h2>Hoitokerrat (${kaynnit?.length ?? 0})</h2>
    ${kaynnitHtml || '<p class="meta">Ei kirjattuja käyntejä.</p>'}

    ${rakennaSuostumusOsio(asiakas)}
    ${ALARIVI}
  `

  const nimiOsa = tiedostonimiTurvallinen(asiakas?.nimi)
  await tulostaPDF(html, `tietopaketti-${nimiOsa}-${tanaan}.pdf`)
}
