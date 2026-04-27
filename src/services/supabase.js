import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uwysictfbzswecnxvmif.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eXNpY3RmYnpzd2Vjbnh2bWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjU0MDIsImV4cCI6MjA5MjgwMTQwMn0.QXMFsuo_WWR8zgzzPwQB1uFaj-dtIV1OKoSp7AKsXg0'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
