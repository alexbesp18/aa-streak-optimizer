import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-load to avoid build-time errors when env vars not set
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not configured')
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

// For backwards compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
}

// Server-side client with service role for writes
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    // Return a mock client that does nothing (for local dev without Supabase)
    console.warn('Supabase not configured, using mock client')
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null, select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        upsert: () => ({ data: [], error: null }),
        eq: () => ({ single: () => ({ data: null, error: null }) }),
      }),
    } as unknown as SupabaseClient
  }

  return createClient(supabaseUrl, serviceKey)
}
