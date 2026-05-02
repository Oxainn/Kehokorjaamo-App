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
