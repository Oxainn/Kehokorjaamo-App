import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [tila, setTila]           = useState('kirjaudu')
  const [sahkoposti, setSahkoposti] = useState('')
  const [salasana, setSalasana]   = useState('')
  const [lataa, setLataa]         = useState(false)
  const [virhe, setVirhe]         = useState(null)
  const [viesti, setViesti]       = useState(null)
  const [näytäSalasana, setNäytäSalasana] = useState(false)

  const käännäVirhe = (error) => {
    if (!error) return
    const msg = error.message ?? ''
    if (msg.includes('invalid'))  return setVirhe('Tarkista sähköpostiosoite')
    if (msg.includes('already'))  return setVirhe('Sähköposti on jo käytössä')
    if (msg.includes('weak'))     return setVirhe('Salasana on liian lyhyt (min 6 merkkiä)')
    setVirhe('Virhe: ' + msg)
  }

  const kirjaudu = async () => {
    setLataa(true)
    setVirhe(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: sahkoposti,
      password: salasana,
    })
    käännäVirhe(error)
    setLataa(false)
  }

  const rekisteroidy = async () => {
    setLataa(true)
    setVirhe(null)
    const { error } = await supabase.auth.signUp({
      email: sahkoposti,
      password: salasana,
    })
    if (error) käännäVirhe(error)
    else setViesti('Tarkista sähköpostisi!')
    setLataa(false)
  }

  const lähetä = (e) => {
    e.preventDefault()
    if (tila === 'kirjaudu') kirjaudu()
    else rekisteroidy()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">Kehokorjaamo</h1>
          <p className="text-gray-500 text-sm mt-1">lihashuolto-opas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            {tila === 'kirjaudu' ? 'Kirjaudu sisään' : 'Luo tili'}
          </h2>

          <form onSubmit={lähetä} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Sähköposti
              </label>
              <input
                type="email"
                value={sahkoposti}
                onChange={(e) => setSahkoposti(e.target.value)}
                placeholder="sinä@esimerkki.fi"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Salasana
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={näytäSalasana ? 'text' : 'password'}
                  value={salasana}
                  onChange={(e) => setSalasana(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={tila === 'kirjaudu' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setNäytäSalasana(!näytäSalasana)}
                  style={{
                    position: 'absolute', right: '8px',
                    top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '18px', color: '#666',
                  }}
                >
                  {näytäSalasana ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {virhe && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {virhe}
              </p>
            )}

            {viesti && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                {viesti}
              </p>
            )}

            <button
              type="submit"
              disabled={lataa}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              {lataa
                ? 'Odota...'
                : tila === 'kirjaudu' ? 'Kirjaudu sisään' : 'Luo tili'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {tila === 'kirjaudu' ? (
              <>
                Ei tiliä?{' '}
                <button
                  type="button"
                  onClick={() => { setTila('rekisteroidy'); setVirhe(null); setViesti(null) }}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Rekisteröidy
                </button>
              </>
            ) : (
              <>
                Onko tili?{' '}
                <button
                  type="button"
                  onClick={() => { setTila('kirjaudu'); setVirhe(null); setViesti(null) }}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Kirjaudu sisään
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
