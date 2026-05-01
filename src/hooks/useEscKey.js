// VB3 — yhteinen Esc-näppäimen kuuntelija modaaleille.
//
// Aiemmin jokainen modaalikomponentti rekisteröi oman keydown-listenerin
// useEffect([onClose])-deps:llä. Koska parent-komponentin onClose-funktio
// usein luotiin uudestaan jokaisella renderillä (ei stable referenssi),
// listener add/remove tapahtui turhasta usein. Tässä hookissa onClose
// pidetään useRef:ssä, jotta listener rekisteröidään VAIN kerran.

import { useEffect, useRef } from 'react'

export function useEscKey(onClose, paalla = true) {
  const callbackRef = useRef(onClose)
  callbackRef.current = onClose

  useEffect(() => {
    if (!paalla) return
    const handler = (e) => {
      if (e.key === 'Escape') callbackRef.current?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [paalla])
}
