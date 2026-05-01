// Vaihe B Pala B9b — online/offline-hook
//
// Palauttaa boolean: true = selain raportoi olevansa verkossa.
// HUOM: navigator.onLine on heuristinen — selain voi raportoida online
// vaikka palvelin ei vastaakaan. Käytä yhdessä fetch-virhevarautumisten
// kanssa, älä luota sokeasti.

import { useState, useEffect } from 'react'

export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const aktivoitu  = () => setOnline(true)
    const passivoitu = () => setOnline(false)
    window.addEventListener('online',  aktivoitu)
    window.addEventListener('offline', passivoitu)
    return () => {
      window.removeEventListener('online',  aktivoitu)
      window.removeEventListener('offline', passivoitu)
    }
  }, [])

  return online
}
