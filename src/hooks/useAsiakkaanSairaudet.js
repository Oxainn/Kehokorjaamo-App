import { useState, useEffect } from 'react'
import { haeAsiakkaanSairaudet } from '../lib/db'

export const useAsiakkaanSairaudet = (asiakasId) => {
  const [sairaudet, setSairaudet] = useState([])
  const [lataa, setLataa]         = useState(false)

  useEffect(() => {
    if (!asiakasId) {
      setSairaudet([])
      return
    }

    let peruttu = false
    setLataa(true)

    haeAsiakkaanSairaudet(asiakasId)
      .then((data) => {
        if (!peruttu) setSairaudet(data ?? [])
      })
      .finally(() => {
        if (!peruttu) setLataa(false)
      })

    return () => { peruttu = true }
  }, [asiakasId])

  const kontraindikaatiot = sairaudet.filter(
    s => s.sairaus_tyyppi?.kontraindikaatio === true
  )

  return { sairaudet, kontraindikaatiot, lataa }
}
