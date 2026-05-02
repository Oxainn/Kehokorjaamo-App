import { createClient } from '@supabase/supabase-js'

const url   = import.meta.env.VITE_SUPABASE_URL
const avain = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG (poistettava kun auth-bugi löydetty): tulostaa env-muuttujien
// raaka-arvon JSON-muodossa jotta rivinvaihdot/whitespace näkyvät.
// Pituus + trim-pituus erottavat tilanteen jossa loppuun jäänyt \n.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[supabase debug] SB_URL:', JSON.stringify(url))
  // eslint-disable-next-line no-console
  console.log('[supabase debug] SB_URL pituus / trim-pituus:', url?.length, '/', url?.trim().length)
  // eslint-disable-next-line no-console
  console.log('[supabase debug] SB_KEY pituus / trim-pituus:', avain?.length, '/', avain?.trim().length)
  // eslint-disable-next-line no-console
  console.log('[supabase debug] SB_KEY ensimmäiset/viimeiset 8 merkkiä:', JSON.stringify(avain?.slice(0, 8)), '/', JSON.stringify(avain?.slice(-8)))
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
