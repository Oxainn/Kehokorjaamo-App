import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'

export default function AllekirjoitusPad({ onChange, error }) {
  const canvasRef  = useRef(null)
  const padRef     = useRef(null)
  const [tyhjä, setTyhjä] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    // Valkoinen tausta jotta JPEG-tallennus ei tuota mustaa läpinäkyvää aluetta.
    // Allekirjoituspaikka on visuaalisesti selkeämpi valkoisena; säilyy sisällä
    // pyöristetyn rajan sisällä joka antaa palstamaisen ulkoasun.
    const pad = new SignaturePad(canvas, {
      penColor: '#1a1a1a',
      backgroundColor: '#ffffff',
      minWidth: 1,
      maxWidth: 3,
    })
    padRef.current = pad

    const onEnd = () => {
      const isEmpty = pad.isEmpty()
      setTyhjä(isEmpty)
      // JPEG 0.7-laatu pakkaa kuvan ~10x pienemmäksi kuin täysi PNG, mikä
      // pitää payloadin Edge Functionin 200 KB -kattorajan alla. Allekirjoitus
      // ei tarvitse läpinäkyvyyttä eikä korkeaa tarkkuutta — pelkkä luettava
      // viiva riittää.
      onChange(isEmpty ? '' : pad.toDataURL('image/jpeg', 0.7))
    }
    pad.addEventListener('endStroke', onEnd)

    skaalaaCanvas(canvas, pad)
    const observer = new ResizeObserver(() => skaalaaCanvas(canvas, pad))
    observer.observe(canvas.parentElement)

    return () => {
      observer.disconnect()
      pad.removeEventListener('endStroke', onEnd)
      pad.off()
    }
  }, [])

  const tyhjennä = () => {
    padRef.current?.clear()
    setTyhjä(true)
    onChange('')
  }

  return (
    <div>
      <div style={{
        border: error ? '1px solid #f87171' : '1px solid #e2e8f0',
        borderRadius: '10px',
        background: '#fafafa',
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '120px', cursor: 'crosshair' }}
        />
        {tyhjä && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '13px', color: '#d1d5db' }}>Allekirjoita tähän sormella tai hiirellä</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
        <button
          type="button"
          onClick={tyhjennä}
          style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
        >
          Tyhjennä
        </button>
      </div>
    </div>
  )
}

function skaalaaCanvas(canvas, pad) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const w = canvas.offsetWidth
  const h = canvas.offsetHeight
  const uusiW = w * ratio
  const uusiH = h * ratio
  // Älä tee mitään jos koko ei muuttunut — turha skaalaus tyhjentäisi piirroksen.
  if (canvas.width === uusiW && canvas.height === uusiH) return
  // Canvas-koon muutos tyhjentää canvasin natiivisti, joten poimi raakadata talteen
  // ja palauta se uuden skaalan jälkeen — muuten viewport-muutos (esim. mobiilin
  // näppäimistön avautuminen tai orientaation kääntyminen) hävittäisi käyttäjän
  // allekirjoituksen.
  const data = pad.isEmpty() ? null : pad.toData()
  canvas.width  = uusiW
  canvas.height = uusiH
  canvas.getContext('2d').scale(ratio, ratio)
  pad.clear()
  if (data) pad.fromData(data)
}
