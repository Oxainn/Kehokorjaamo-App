// Vaihe B Pala B9b — offline-tallennus IndexedDB:hen.
//
// Kaksi store:a:
//   cache  (key: string)             — yleinen avain-arvo-välimuisti, esim.
//                                      hoitokaynti:{id}, havainnot:{id}
//   queue  (id: autoincrement)       — outbound-mutaatiot jotka ovat
//                                      odottamassa serveriä. Rivin muoto:
//                                      { op: 'tallennaHoitokirjaus',
//                                        args: [...], luotu: timestamp }
//
// Käytetään natiivia IndexedDB-rajapintaa — ei lisättyä dexie-riippuvuutta.

const DB_NAME = 'kehokorjaamo-offline'
const DB_VERSION = 1

let dbPromise = null

function avaaDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB ei ole käytössä'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'avain' })
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onerror   = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
  return dbPromise
}

export async function tallennaCache(avain, data) {
  try {
    const db = await avaaDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('cache', 'readwrite')
      tx.objectStore('cache').put({ avain, data, paivitetty: Date.now() })
      tx.oncomplete = () => resolve(true)
      tx.onerror    = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[offlineDB] tallennaCache epäonnistui:', e)
    return false
  }
}

export async function lueCache(avain) {
  try {
    const db = await avaaDB()
    return await new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly')
      const req = tx.objectStore('cache').get(avain)
      req.onsuccess = () => resolve(req.result?.data ?? null)
      req.onerror   = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function lisaaJonoon(item) {
  const db = await avaaDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').add({ ...item, luotu: Date.now() })
    tx.oncomplete = () => resolve(true)
    tx.onerror    = () => reject(tx.error)
  })
}

export async function lueJono() {
  try {
    const db = await avaaDB()
    return await new Promise((resolve) => {
      const tx = db.transaction('queue', 'readonly')
      const req = tx.objectStore('queue').getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror   = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function poistaJonosta(id) {
  try {
    const db = await avaaDB()
    return await new Promise((resolve) => {
      const tx = db.transaction('queue', 'readwrite')
      tx.objectStore('queue').delete(id)
      tx.oncomplete = () => resolve(true)
      tx.onerror    = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function jononKoko() {
  try {
    const db = await avaaDB()
    return await new Promise((resolve) => {
      const tx = db.transaction('queue', 'readonly')
      const req = tx.objectStore('queue').count()
      req.onsuccess = () => resolve(req.result ?? 0)
      req.onerror   = () => resolve(0)
    })
  } catch {
    return 0
  }
}
