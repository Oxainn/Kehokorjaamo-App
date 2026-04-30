import { useRef, useEffect } from 'react'

// Säätää textarea-elementin korkeutta sisällön mukaan.
// Käyttö: const ref = useAutoResize(arvo); <textarea ref={ref} ... />
export function useAutoResize(arvo) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Resetoi korkeus jotta scrollHeight on tarkka mittaus
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [arvo])

  return ref
}
