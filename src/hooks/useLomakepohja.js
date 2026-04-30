import { useState, useEffect } from 'react'
import { haeLomakepohja } from '../lib/db'

export const useLomakepohja = (pohjaId) => {
  const [pohja,   setPohja]   = useState(null)
  const [rakenne, setRakenne] = useState(null)
  const [kentat,  setKentat]  = useState({})
  const [lataa,   setLataa]   = useState(false)
  const [virhe,   setVirhe]   = useState(null)

  useEffect(() => {
    if (!pohjaId) {
      setPohja(null)
      setRakenne(null)
      setKentat({})
      setLataa(false)
      setVirhe(null)
      return
    }

    let peruttu = false
    setLataa(true)
    setVirhe(null)

    haeLomakepohja(pohjaId)
      .then((tulos) => {
        if (peruttu) return
        setPohja(tulos.pohja)
        setRakenne(tulos.rakenne)
        setKentat(tulos.kentat)
        setVirhe(tulos.virhe)
      })
      .catch(() => {
        if (!peruttu) setVirhe('Lomakepohjan lataus epäonnistui')
      })
      .finally(() => {
        if (!peruttu) setLataa(false)
      })

    return () => { peruttu = true }
  }, [pohjaId])

  return { pohja, rakenne, kentat, lataa, virhe }
}
