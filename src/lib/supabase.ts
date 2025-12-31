import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Message = {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  created_at: string
}

export type Chat = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}
