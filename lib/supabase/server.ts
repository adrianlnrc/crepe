import { createClient } from '@supabase/supabase-js'

let serverClient: ReturnType<typeof createClient> | null = null

export function getServerClient() {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables (server)')
    }

    serverClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return serverClient
}

// Note: To call an RPC function, use:
// const { data, error } = await getServerClient().rpc('function_name', { param: value })
// Catch errors and handle appropriately in calling code
