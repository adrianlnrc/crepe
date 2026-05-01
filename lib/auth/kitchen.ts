import bcrypt from 'bcryptjs'
import { getServerClient } from '@/lib/supabase/server'
import { signKitchenSession, verifyKitchenSession } from '@/lib/supabase/middleware'

// Verifica código da cozinha contra hash armazenado no DB
export async function verifyKitchenCode(code: string, eventId: string): Promise<boolean> {
  try {
    const client = getServerClient()
    const { data, error } = await client
      .from('events')
      .select('kitchen_code_hash')
      .eq('id', eventId)
      .single<{ kitchen_code_hash: string }>()

    if (error || !data) {
      return false
    }

    // Compara com hash bcrypt
    return await bcrypt.compare(code, data.kitchen_code_hash)
  } catch {
    return false
  }
}

// Re-exports de middleware para uso em rotas
export { signKitchenSession, verifyKitchenSession }
