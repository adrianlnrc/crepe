'use client'

import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createClient> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase environment variables (browser)')
    }

    browserClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Guests não precisam de sessão persistida
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  return browserClient
}

// Helper para adicionar headers a requests de queries
// Headers são passados via opções ao fazer queries
export function getClientKeyHeader(clientKey: string) {
  return {
    headers: {
      'x-client-key': clientKey,
    },
  }
}

// Helper para adicionar headers de kitchen session
export function getKitchenSessionHeader(sessionId: string) {
  return {
    headers: {
      'x-kitchen-session-id': sessionId,
    },
  }
}
