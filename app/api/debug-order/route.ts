import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const client = getServerClient()

    // Buscar evento
    const { data: event } = await client
      .from('events')
      .select('id, name, kitchen_code_hash')
      .eq('is_active', true)
      .single()

    // Tentar inserir pedido fake
    const fakeClientKey = `019de386-${Math.random().toString(16).slice(2, 6)}-7${Math.random().toString(16).slice(2, 5)}-8${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`

    const { data: newOrder, error: insertError } = await client
      .from('orders')
      .insert({
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        client_key: fakeClientKey,
        first_name: 'Debug',
        last_name: 'Test',
        flavor_id: 'f1000001-0000-0000-0000-000000000001',
        ingredient_ids: [],
        observation: null,
      })
      .select()
      .single()

    return NextResponse.json({
      event_found: !!event,
      event_name: (event as { name?: string } | null)?.name,
      hash_preview: (event as { kitchen_code_hash?: string } | null)?.kitchen_code_hash?.slice(0, 20) + '...',
      hash_length: (event as { kitchen_code_hash?: string } | null)?.kitchen_code_hash?.length,
      insert_success: !!newOrder,
      insert_error: insertError ? {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      } : null,
      order_id: (newOrder as { id?: string } | null)?.id ?? null,
    })
  } catch (err) {
    return NextResponse.json({
      caught: String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    }, { status: 500 })
  }
}
