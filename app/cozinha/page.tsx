import { getServerClient } from '@/lib/supabase/server'
import { RealtimeOrdersList } from './_components/realtime-orders-list'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Painel da Cozinha',
  description: 'Gerenciador de fila de pedidos',
}

export default async function CozinhaPage() {
  const client = getServerClient()

  const { data: event } = await client
    .from('events')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single<{ id: string }>()

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

  const eventId = event.id

  // Pedidos ativos com sabor já populado
  const { data: initialOrders } = await ((client as any)
    .from('orders')
    .select(
      `
      id, sequence_number, first_name, last_name, flavor_id, ingredient_ids, observation, status, created_at, started_at,
      flavors (id, name, category, tempo_medio_preparo)
    `
    )
    .eq('event_id', eventId)
    .in('status', ['pending', 'in_progress'])
    .order('sequence_number', { ascending: true })
    .order('id', { ascending: true }))

  // Lookups: usados pra hidratar pedidos que chegam via Realtime sem joins
  const { data: flavorsList } = await client
    .from('flavors')
    .select('id, name, category, tempo_medio_preparo')
    .eq('event_id', eventId)

  const { data: ingredientsList } = await client
    .from('ingredients')
    .select('id, name')
    .eq('event_id', eventId)

  const flavorsById = Object.fromEntries(
    ((flavorsList || []) as { id: string; name: string; category: string; tempo_medio_preparo: number | null }[])
      .map((f) => [f.id, f])
  )
  const ingredientsById = Object.fromEntries(
    ((ingredientsList || []) as { id: string; name: string }[]).map((i) => [i.id, i])
  )

  const { count: doneCount } = await (client as any)
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'done')

  return (
    <div className="min-h-dvh bg-background">
      <RealtimeOrdersList
        eventId={eventId}
        initialOrders={initialOrders || []}
        initialDoneCount={doneCount || 0}
        flavorsById={flavorsById}
        ingredientsById={ingredientsById}
      />
    </div>
  )
}
