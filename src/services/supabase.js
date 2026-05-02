import { createClient } from '@supabase/supabase-js'

const url   = import.meta.env.VITE_SUPABASE_URL
const avain = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG (poistettava kun auth-bugi löydetty): URL/avain-tarkistus,
// nykyinen window.location module-init-aikaan, ja auth-event-listener
// joka tulostaa kaikki Supabasen sisäiset auth-tapahtumat.
if (typeof window !== 'undefined') {
  /* eslint-disable no-console */
  console.log('[supabase debug] SB_URL:', JSON.stringify(url))
  console.log('[supabase debug] SB_URL pituus / trim-pituus:', url?.length, '/', url?.trim().length)
  console.log('[supabase debug] SB_KEY pituus / trim-pituus:', avain?.length, '/', avain?.trim().length)
  console.log('[supabase debug] SB_KEY ensimmäiset/viimeiset 8 merkkiä:', JSON.stringify(avain?.slice(0, 8)), '/', JSON.stringify(avain?.slice(-8)))
  console.log('[supabase debug] window.location.href module-init:', JSON.stringify(window.location.href))
  console.log('[supabase debug] window.location.search:', JSON.stringify(window.location.search))
  console.log('[supabase debug] window.location.hash:', JSON.stringify(window.location.hash))

  // localStorage-avaimet jotka liittyvät Supabaseen — code_verifier mukana
  // jos PKCE-flow on käynnissä. Sisältö paljastaa mahdolliset epämuodot.
  try {
    const sbAvaimet = Object.keys(window.localStorage).filter(k => k.startsWith('sb-') || k.includes('supabase'))
    console.log('[supabase debug] localStorage sb-avaimet:', sbAvaimet)
    for (const k of sbAvaimet) {
      const v = window.localStorage.getItem(k)
      console.log(`[supabase debug] localStorage[${k}] pituus:`, v?.length, 'esim:', JSON.stringify(v?.slice(0, 60)))
    }
  } catch (e) {
    console.log('[supabase debug] localStorage-luku epäonnistui:', e.message)
  }
  /* eslint-enable no-console */
}

export const supabase = createClient(url, avain, {
  auth: {
    flowType:          'pkce',
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: true,
    storage:           window.localStorage,
  },
})

// DEBUG: auth-event-listener — tulostaa kaikki sisäiset tapahtumat
// (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED).
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    /* eslint-disable-next-line no-console */
    console.log('[supabase debug] auth-event:', event, 'session?', !!session, 'user?', session?.user?.email)
  })

  // hashchange + popstate kuvaavat URL:n muutoksia OAuth-callbackin aikana
  window.addEventListener('hashchange', () => {
    /* eslint-disable-next-line no-console */
    console.log('[supabase debug] hashchange → href:', JSON.stringify(window.location.href))
  })
  window.addEventListener('popstate', () => {
    /* eslint-disable-next-line no-console */
    console.log('[supabase debug] popstate → href:', JSON.stringify(window.location.href))
  })

  // Global error catcher — Supabasen sisäinen _exchangeCodeForSession heittää
  // TypeErrorin (Failed to execute 'fetch'…) joka ei kulje onAuthStateChangeen.
  // unhandledrejection ottaa kiinni Supabasen async-virheet.
  window.addEventListener('unhandledrejection', (e) => {
    /* eslint-disable-next-line no-console */
    console.log('[supabase debug] unhandledrejection:', e.reason?.name, e.reason?.message, '\nstack:', e.reason?.stack)
  })
  window.addEventListener('error', (e) => {
    if (e.error || e.message) {
      /* eslint-disable-next-line no-console */
      console.log('[supabase debug] window error:', e.message, e.error?.name, e.error?.stack)
    }
  })
}
