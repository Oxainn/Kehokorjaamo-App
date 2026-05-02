// KA2 — Pose-detection asentokuville. Kapseloi TensorFlow.js + MoveNet
// Thunder -mallin lataamisen ja yksittäisen kuvan analysoinnin.
//
// Lazy-load: malli (~25 MB) ladataan vasta kun ensimmäinen tunnistus
// pyydetään, ei sivun avauksessa. Cachetetaan moduulin tasolla — sama
// detektori käytetään uudelleen kaikille kuville.
//
// Käyttö:
//   import { tunnistaKeypointit, KEYPOINT_NIMET } from '../lib/poseAnalysis'
//   const keypointit = await tunnistaKeypointit(kuvaDataUrl)
//   // keypointit: [{ name, x, y, score }] tai null jos ei tunnistettu

import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'  // GPU-pohjainen, nopeampi kuin CPU
import * as poseDetection from '@tensorflow-models/pose-detection'

let detectorPromise = null
let detectorVirhe = null

// MoveNet COCO-formaatti — 17 keypointia. Nimet vastaavat mallin
// palauttamia name-kenttiä.
export const KEYPOINT_NIMET = [
  'nose',
  'left_eye', 'right_eye',
  'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
]

// Yhteyspisteet luurankoa varten (KA2 visualisointi)
export const SKELETTI_LINJAT = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
]

// Keypointien ryhmät värikoodausta varten
export const KEYPOINT_RYHMA = {
  nose: 'kasvot', left_eye: 'kasvot', right_eye: 'kasvot',
  left_ear: 'kasvot', right_ear: 'kasvot',
  left_shoulder: 'ylavartalo', right_shoulder: 'ylavartalo',
  left_elbow: 'ylavartalo', right_elbow: 'ylavartalo',
  left_wrist: 'ylavartalo', right_wrist: 'ylavartalo',
  left_hip: 'alavartalo', right_hip: 'alavartalo',
  left_knee: 'alavartalo', right_knee: 'alavartalo',
  left_ankle: 'alavartalo', right_ankle: 'alavartalo',
}

export const RYHMA_VARIT = {
  kasvot:     '#eab308',  // keltainen
  ylavartalo: '#3b82f6',  // sininen
  alavartalo: '#16a34a',  // vihreä
}

// Confidence-raja jonka alapuolella piste merkitään epävarmaksi (KA1-KA2)
// Käytössä vielä laskureissa (X/17 hyvää) ja luuranko-piirrossa.
export const CONFIDENCE_RAJA = 0.3

// KA2-fix: Confidence-tasot UI-värikoodausta varten.
//   varma:    score > 0.5  → vihreä
//   epavarma: 0.3-0.5      → keltainen ("voi korjata KA4:ssä")
//   huono:    < 0.3        → punainen ("epäluotettava")
export const CONFIDENCE_VARMA = 0.5

export function luokitaConfidence(score) {
  if (score >= CONFIDENCE_VARMA) return 'varma'
  if (score >= CONFIDENCE_RAJA)  return 'epavarma'
  return 'huono'
}

export const CONFIDENCE_VARIT = {
  varma:    '#16a34a',  // vihreä
  epavarma: '#eab308',  // keltainen
  huono:    '#dc2626',  // punainen
}

// Lataa MoveNet Thunder -malli kerran ja cachee promise. Jos lataus
// epäonnistuu (esim. WebGL:ää ei tue), virhe tallennetaan ja palautetaan
// kutsuissa eteenpäin.
async function alustaDetektor() {
  if (detectorPromise) return detectorPromise
  detectorPromise = (async () => {
    try {
      // Aseta WebGL-backend (nopein selaimissa). Jos ei tue, fallback CPU.
      await tf.ready()
      try {
        await tf.setBackend('webgl')
      } catch {
        await tf.setBackend('cpu')
      }
      const det = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER },
      )
      return det
    } catch (e) {
      detectorVirhe = e
      throw e
    }
  })()
  return detectorPromise
}

function ladaaKuva(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.crossOrigin = 'anonymous'
    img.src = dataUrl
  })
}

// Pää-API: ottaa kuva data-URL:nä (base64 JPEG kuten asentokuvat-taulu),
// palauttaa keypoint-listan tai null jos posea ei tunnistettu.
//
// Palautusmuoto:
//   { keypointit: [{ name, x, y, score }], hyvienMaara, kokonaisMaara }
// tai
//   { virhe: '...' }
export async function tunnistaKeypointit(kuvaDataUrl) {
  if (!kuvaDataUrl) return { virhe: 'Kuva puuttuu' }
  try {
    const det = await alustaDetektor()
    const img = await ladaaKuva(kuvaDataUrl)
    // Varmista että kuva on täysin ladattu (decode resolvoituu kun pikselit ovat valmiit)
    if (typeof img.decode === 'function') {
      try { await img.decode() } catch { /* ignore — joillekin kuville ei toimi */ }
    }
    const poses = await det.estimatePoses(img, { maxPoses: 1, flipHorizontal: false })
    if (!poses || poses.length === 0) {
      return { virhe: 'Ei tunnistettu — asiakas ei näy kuvassa selvästi' }
    }
    const kp = poses[0].keypoints ?? []
    if (kp.length === 0) {
      return { virhe: 'Ei keypointteja' }
    }
    // Palauta KAIKKI 17 keypointia — älä suodata. Käyttäjä voi korjata
    // epävarmat pisteet KA4:ssä manuaalisesti.
    const yksinkertaiset = kp.map((p) => ({
      name:  p.name,
      x:     p.x,
      y:     p.y,
      score: p.score ?? 0,
    }))
    const hyvienMaara = yksinkertaiset.filter((p) => p.score >= CONFIDENCE_RAJA).length

    // KA2-debug: konsoliloki kaikkien keypointtien score-arvoista
    if (typeof console !== 'undefined') {
      console.log(
        '[Pose-detection] Tunnistettu',
        `${hyvienMaara}/${yksinkertaiset.length}`,
        'pistettä (>=', CONFIDENCE_RAJA, ')\n' +
        yksinkertaiset.map((p) => `  ${p.name.padEnd(16)} ${p.score.toFixed(2)}`).join('\n'),
      )
    }
    return {
      keypointit:    yksinkertaiset,
      hyvienMaara,
      kokonaisMaara: yksinkertaiset.length,
      kuvaLeveys:    img.naturalWidth,
      kuvaKorkeus:   img.naturalHeight,
    }
  } catch (e) {
    return { virhe: e?.message ?? 'Pose-detection epäonnistui' }
  }
}

export function detektorinTila() {
  return { virhe: detectorVirhe }
}

// ─────────────────────────────────────────────────────────────────────────
// KA3 — Kulmien laskenta keypointeista
// ─────────────────────────────────────────────────────────────────────────
//
// laskeKulmat(keypointit, nakokulma, asiakasPituusCm) palauttaa anatomiset
// kulmat ja epätasapainot näkökulman mukaan. Kaikki cm-arvot perustuvat
// pikseli-kalibrointiin: nose-to-ankle pikseliväli ≈ 92% asiakkaan pituudesta.
//
// Jos asiakkaan pituutta ei tiedetä, käytetään oletusta 170 cm. Tämä antaa
// kohtalaisen approksimaation — trendianalyysissä (käynti vs käynti) suhteet
// säilyvät vaikka absoluuttinen kalibrointi olisi pielessä.
//
// Palautusmuoto: { ...kulmat, kalibrointi: { pikseleitaCm, ... } } tai
// { virhe: '...' } jos riittäviä keypointteja ei ole.

export const ASIAKKAAN_OLETUSPITUUS_CM = 170

function nimella(keypointit, nimi) {
  return keypointit?.find((k) => k.name === nimi) ?? null
}

function onLuotettava(p) {
  return p && typeof p.score === 'number' && p.score >= CONFIDENCE_RAJA
}

// Pikseliväli pisteiden välillä
function pikselivali(p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Kahden pisteen muodostaman linjan kulma vaakatasoon (asteina).
// 0° = vaakaan, +° = p2 alempana (canvas Y kasvaa alaspäin)
function kulmaVaakatasoon(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

// Kahden pisteen muodostaman linjan kulma pystysuoraan (asteina).
// 0° = pystysuoraan, +° = p2 oikealla puolella
function kulmaPystyyn(p1, p2) {
  return Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI)
}

// Kulma kolmen pisteen kärjessä p2 (atan2-pohjainen, palauttaa 0-180).
// p1 ja p3 ovat kärjen ulokkeet.
function kulmaPisteessa(p1, p2, p3) {
  const v1x = p1.x - p2.x, v1y = p1.y - p2.y
  const v2x = p3.x - p2.x, v2y = p3.y - p2.y
  const dot = v1x * v2x + v1y * v2y
  const m1 = Math.sqrt(v1x * v1x + v1y * v1y)
  const m2 = Math.sqrt(v2x * v2x + v2y * v2y)
  if (m1 === 0 || m2 === 0) return null
  const cosA = Math.max(-1, Math.min(1, dot / (m1 * m2)))
  return Math.acos(cosA) * (180 / Math.PI)
}

// Pikseleitä per cm — asiakkaan pituudesta + nose-to-ankle pikseliväli.
// Käytä keskimmäistä nilkkaa (parempi confidence) tai keskiarvoa.
function laskePikseleitaCm(kp, pituusCm) {
  const nose = nimella(kp, 'nose')
  const lAnkle = nimella(kp, 'left_ankle')
  const rAnkle = nimella(kp, 'right_ankle')
  if (!onLuotettava(nose)) return null
  // Käytä parempi-scoreista nilkkaa, tai keskiarvoa jos molemmat luotettavia
  let ankleY = null
  if (onLuotettava(lAnkle) && onLuotettava(rAnkle)) {
    ankleY = (lAnkle.y + rAnkle.y) / 2
  } else if (onLuotettava(lAnkle)) {
    ankleY = lAnkle.y
  } else if (onLuotettava(rAnkle)) {
    ankleY = rAnkle.y
  } else {
    return null
  }
  const pikseliKorkeus = Math.abs(ankleY - nose.y)
  // Nose-to-ankle ≈ 92% pituudesta (pään yläosa ~8% ylempänä kuin nose)
  const cmReferenssi = pituusCm * 0.92
  if (cmReferenssi <= 0) return null
  return pikseliKorkeus / cmReferenssi  // pikseliä per cm
}

// Pyöristä kohtuullinen tarkkuus
function py(arvo, des = 1) {
  if (arvo == null || !isFinite(arvo)) return null
  const k = Math.pow(10, des)
  return Math.round(arvo * k) / k
}

// EDESTÄ ja TAKAA — yhteinen lasku symmetrisistä pisteistä
function laskeSymmetriaKulmat(kp, pikseleitaCm) {
  const tulos = {}
  const lShoulder = nimella(kp, 'left_shoulder')
  const rShoulder = nimella(kp, 'right_shoulder')
  const lHip = nimella(kp, 'left_hip')
  const rHip = nimella(kp, 'right_hip')
  const lKnee = nimella(kp, 'left_knee')
  const rKnee = nimella(kp, 'right_knee')
  const lAnkle = nimella(kp, 'left_ankle')
  const rAnkle = nimella(kp, 'right_ankle')

  if (onLuotettava(lShoulder) && onLuotettava(rShoulder) && pikseleitaCm) {
    tulos.olkapaiden_korkeusero_cm = py((rShoulder.y - lShoulder.y) / pikseleitaCm)
    tulos.olkapaiden_kaltevuus_aste = py(kulmaVaakatasoon(lShoulder, rShoulder))
  }
  if (onLuotettava(lHip) && onLuotettava(rHip) && pikseleitaCm) {
    tulos.lantion_korkeusero_cm = py((rHip.y - lHip.y) / pikseleitaCm)
    tulos.lantion_kaltevuus_aste = py(kulmaVaakatasoon(lHip, rHip))
  }
  if (onLuotettava(lAnkle) && onLuotettava(rAnkle) && pikseleitaCm) {
    tulos.jalkapituus_ero_cm = py((rAnkle.y - lAnkle.y) / pikseleitaCm)
  }
  if (onLuotettava(lKnee) && onLuotettava(rKnee)) {
    tulos.polvien_kaltevuus_aste = py(kulmaVaakatasoon(lKnee, rKnee))
  }
  return tulos
}

// TAKAA: skolioosi-arvio = ylävartalon keskilinjan poikkeama lantion keski-
// linjasta. Lasketaan olkapäiden keskipisteen ja lantion keskipisteen välisen
// linjan kulma pystysuoraan.
function laskeSkolioosi(kp) {
  const lShoulder = nimella(kp, 'left_shoulder')
  const rShoulder = nimella(kp, 'right_shoulder')
  const lHip = nimella(kp, 'left_hip')
  const rHip = nimella(kp, 'right_hip')
  if (!onLuotettava(lShoulder) || !onLuotettava(rShoulder)) return null
  if (!onLuotettava(lHip) || !onLuotettava(rHip)) return null
  const olkaKp = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 }
  const lantioKp = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 }
  // Lantio on alempana → kulma kp:lantio→olka pystysuoraan
  return kulmaPystyyn(lantioKp, olkaKp)
}

// SIVULTA — käytetään sitä puolta, joka näkyy kameralle.
//   nakokulma 'vasen' → henkilön vasen sivu kameraan → näkyvät pisteet ovat
//                       left_*. (Kuvataan asiakkaasta vasemmalta.)
//   nakokulma 'oikea' → näkyvät pisteet ovat right_*.
function laskeSivuKulmat(kp, nakokulma, pikseleitaCm) {
  const tulos = {}
  const puoli = nakokulma === 'vasen' ? 'left' : 'right'
  const ear = nimella(kp, `${puoli}_ear`)
  const shoulder = nimella(kp, `${puoli}_shoulder`)
  const hip = nimella(kp, `${puoli}_hip`)
  const knee = nimella(kp, `${puoli}_knee`)
  const ankle = nimella(kp, `${puoli}_ankle`)

  // Pään eteen työntyminen — korva vs olkapää X-suunnassa
  if (onLuotettava(ear) && onLuotettava(shoulder) && pikseleitaCm) {
    // Vasemmalta kuvattuna kasvot katsovat oikealle (X kasvaa) → eteen = +X
    // Oikealta kuvattuna kasvot katsovat vasemmalle (X pienenee) → eteen = -X
    const merkki = nakokulma === 'vasen' ? 1 : -1
    tulos.paan_eteen_tyontyminen_cm = py(merkki * (ear.x - shoulder.x) / pikseleitaCm)
  }

  // Olkapään eteen työntyminen — olkapää vs lantio X-suunnassa
  if (onLuotettava(shoulder) && onLuotettava(hip) && pikseleitaCm) {
    const merkki = nakokulma === 'vasen' ? 1 : -1
    tulos.olkapaan_eteen_tyontyminen_cm = py(merkki * (shoulder.x - hip.x) / pikseleitaCm)
  }

  // Lantion kallistuskulma — ylävartalon kallistus pystysuoraan (proxy
  // pelvic tiltille, koska ASIS/PSIS ei näy MoveNetin pisteissä)
  if (onLuotettava(shoulder) && onLuotettava(hip)) {
    // Kulma lantio→olkapää pystysuoraan. + = ylävartalo etukenossa
    const merkki = nakokulma === 'vasen' ? 1 : -1
    tulos.lantion_kallistuskulma_aste = py(merkki * kulmaPystyyn(hip, shoulder))
  }

  // Polvi yliojennus — sisäkulma lonkka-polvi-nilkka. Suora jalka = 180°.
  // Yliojennus tarkoittaa että polvi työntyy taakse (posterioorisesti) →
  // kulma > 180° tarkasteltuna sagittaalitasosta. atan2-perustainen
  // sisäkulma kulmaPisteessa palauttaa 0-180, joten käytämme tähän
  // signed deviaatiota: positiivinen = polvi etukäyrässä (taipunut),
  // negatiivinen = polvi on hipin ja nilkan suoran linjan takana (yliojennus).
  if (onLuotettava(hip) && onLuotettava(knee) && onLuotettava(ankle)) {
    const polviKulma = kulmaPisteessa(hip, knee, ankle)
    if (polviKulma != null) {
      // Selvitä onko polvi suoran linjan etu- vai takapuolella
      // Lasketaan polven X-poikkeama hipin-nilkan suorasta
      const t = (knee.y - hip.y) / (ankle.y - hip.y || 1)
      const linjaX = hip.x + t * (ankle.x - hip.x)
      const polviPoikkeamaX = knee.x - linjaX
      // Vasemmalta kuvattuna eteen = +X, taakse = -X (yliojennus)
      // Oikealta kuvattuna eteen = -X, taakse = +X (yliojennus)
      const eteen = (nakokulma === 'vasen' ? polviPoikkeamaX : -polviPoikkeamaX)
      const yliojennus = eteen < 0 ? Math.abs(180 - polviKulma) : -(180 - polviKulma)
      tulos.polvi_kulma_aste = py(polviKulma)
      tulos.polvi_yliojennus_aste = py(yliojennus)
    }
  }

  return tulos
}

export function laskeKulmat(keypointit, nakokulma, asiakasPituusCm = ASIAKKAAN_OLETUSPITUUS_CM) {
  if (!Array.isArray(keypointit) || keypointit.length === 0) {
    return { virhe: 'Ei keypointteja' }
  }
  const pituus = asiakasPituusCm ?? ASIAKKAAN_OLETUSPITUUS_CM
  const pikseleitaCm = laskePikseleitaCm(keypointit, pituus)

  let kulmat = {}
  if (nakokulma === 'edesta') {
    kulmat = laskeSymmetriaKulmat(keypointit, pikseleitaCm)
  } else if (nakokulma === 'takaa') {
    kulmat = laskeSymmetriaKulmat(keypointit, pikseleitaCm)
    const skolioosi = laskeSkolioosi(keypointit)
    if (skolioosi != null) kulmat.skolioosi_aste = py(skolioosi)
  } else if (nakokulma === 'vasen' || nakokulma === 'oikea') {
    kulmat = laskeSivuKulmat(keypointit, nakokulma, pikseleitaCm)
  }

  return {
    ...kulmat,
    kalibrointi: {
      pituus_cm:        pituus,
      pikseleita_per_cm: py(pikseleitaCm, 3),
      laskettu:         new Date().toISOString(),
      nakokulma,
    },
  }
}

// UI-ystävälliset selitteet jokaiselle kulma-avaimelle. Komponentti voi
// käyttää näitä ilman duplikointia.
export const KULMA_SELITTEET = {
  olkapaiden_korkeusero_cm:      { otsikko: 'Olkapäiden korkeusero',     yksikko: 'cm', plus: 'oikea alempi',   miinus: 'vasen alempi' },
  olkapaiden_kaltevuus_aste:     { otsikko: 'Olkapäiden kaltevuus',      yksikko: '°',  plus: 'oikealle',       miinus: 'vasemmalle' },
  lantion_korkeusero_cm:         { otsikko: 'Lantion korkeusero',        yksikko: 'cm', plus: 'oikea alempi',   miinus: 'vasen alempi' },
  lantion_kaltevuus_aste:        { otsikko: 'Lantion kaltevuus',         yksikko: '°',  plus: 'oikealle',       miinus: 'vasemmalle' },
  jalkapituus_ero_cm:            { otsikko: 'Jalkapituus-ero (nilkat)',  yksikko: 'cm', plus: 'oikea lyhyempi', miinus: 'vasen lyhyempi' },
  polvien_kaltevuus_aste:        { otsikko: 'Polvien kaltevuus',         yksikko: '°',  plus: 'oikealle',       miinus: 'vasemmalle' },
  skolioosi_aste:                { otsikko: 'Selän keskilinjan poikkeama', yksikko: '°', plus: 'oikealle',     miinus: 'vasemmalle' },
  paan_eteen_tyontyminen_cm:     { otsikko: 'Pään eteen työntyminen',    yksikko: 'cm', plus: 'eteen',          miinus: 'taakse' },
  olkapaan_eteen_tyontyminen_cm: { otsikko: 'Olkapään eteen työntyminen', yksikko: 'cm', plus: 'eteen',         miinus: 'taakse' },
  lantion_kallistuskulma_aste:   { otsikko: 'Ylävartalon kallistus',     yksikko: '°',  plus: 'etukenossa',     miinus: 'takakenossa' },
  polvi_kulma_aste:              { otsikko: 'Polvi-kulma (sisä)',        yksikko: '°',  plus: '',               miinus: '' },
  polvi_yliojennus_aste:         { otsikko: 'Polvi-yliojennus',          yksikko: '°',  plus: 'taipunut etukäyrään', miinus: 'yliojentunut' },
}

// Muotoile yksittäisen kulman arvo lukukelpoiseksi tekstiksi suuntaviivalla.
//   formatoiKulma('olkapaiden_korkeusero_cm', 1.5) → "1.5 cm (oikea alempi)"
export function formatoiKulma(avain, arvo) {
  const sel = KULMA_SELITTEET[avain]
  if (!sel || arvo == null || !isFinite(arvo)) return null
  const merkkiTeksti = arvo > 0 ? sel.plus : (arvo < 0 ? sel.miinus : '')
  const abs = Math.abs(arvo)
  const numero = `${py(abs, 1)} ${sel.yksikko}`
  return merkkiTeksti ? `${numero} (${merkkiTeksti})` : numero
}
