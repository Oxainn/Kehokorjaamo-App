import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './components/App'
import Esitiedot from './pages/Esitiedot'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/esitiedot" element={<Esitiedot />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
