import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './components/App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Catch-all → App. App.jsx tarkistaa itse pathname:n ja URL-parametrit
            ja renderöi oikean näkymän (Login / Asiakasrekisteri / PalveluValinta /
            JulkinenLomake). Tämä pitää reititysrakenteen yhdessä paikassa. */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

// Pala B9b — Service Worker: cachetä app-shelli jotta Hoitokirjaus
// avautuu offline. Network-first → online tilassa aina tuore versio,
// offline tilassa fallback cacheen. Vain prod-buildissa (devissä
// Vite hoitaa hot reloadin itse).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((e) => {
      console.warn('Service Worker -rekisteröinti epäonnistui:', e)
    })
  })
}
