import { createClient } from '@supabase/supabase-js'

const url   = import.meta.env.VITE_SUPABASE_URL
const avain = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, avain, {
  auth: {
    flowType:          'pkce',
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: true,
    storage:           window.localStorage,
  },
})
