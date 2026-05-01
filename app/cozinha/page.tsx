import { getServerClient } from '@/lib/supabase/server'
import { RealtimeOrdersList } from './_components/realtime-orders-list'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Painel da Cozinha',
  description: 'Gerenciador de fila de pedidos',
}

export default async function CozinhaPage() {
  // Busca evento ativo e seus pedidos inicialmente
  const client = getServerClient()

  const { data: event } = await client
    .from('events')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Nenhum evento ativo</h1>
          <p className="text-muted-foreground">Aguarde um evento para começar.</p>
        </div>
      </div>
    )
  }

  // Busca pedidos iniciais
  const { data: initialOrders } = await ((client as any)
    .from('orders')
    .select(
      `
      id, sequence_number, first_name, last_name, flavor_id, ingredient_ids, observation, status, created_at, started_at,
      flavors (id, name, category, tempo_medio_preparo)
    `
    )
    .eq('event_id', (event as any).id)
    .in('status', ['pending', 'in_progress'])
    .order('sequence_number', { ascending: true })
    .order('id', { ascending: true }))

  return (
    <div className="min-h-dvh bg-background">
      <RealtimeOrdersList eventId={(event as any).id} initialOrders={initialOrders || []} />
    </div>
  )
}
