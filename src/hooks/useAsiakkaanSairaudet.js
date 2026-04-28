import { useState, useEffect, useRef } from 'react'
import { haeAsiakkaanSairaudet } from '../lib/db'

export const useAsiakkaanSairaudet = (asiakasId) => {
  const [sairaudet, setSairaudet] = useState([])
  const [lataa, setLataa]         = useState(false)
  const kaynnissaRef              = useRef(false)

  useEffect(() => {
    if (!asiakasId) {
      setSairaudet([])
      setLataa(false)
      return
    }

    // Älä käynnistä uutta hakua jos edellinen on vielä kesken
    if (kaynnissaRef.current) return

    let peruttu = false
    kaynnissaRef.current = true
    setLataa(true)

    haeAsiakkaanSairaudet(asiakasId)
      .then((data) => {
        if (!peruttu) setSairaudet(data ?? [])
      })
      .catch(() => {
        if (!peruttu) setSairaudet([])
      })
      .finally(() => {
        kaynnissaRef.current = false
        if (!peruttu) setLataa(false)
      })

    return () => { peruttu = true }
  }, [asiakasId])

  const kontraindikaatiot = sairaudet.filter(
    s => s.sairaus_tyyppi?.kontraindikaatio === true
  )

  return { sairaudet, kontraindikaatiot, lataa }
}
