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
