import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { OrderForm } from './_components/order-form'

export const metadata = {
  title: 'Faça seu Pedido',
  description: 'Preencha seu pedido de crepe',
}

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: { event?: string }
}) {
  const eventId = searchParams.event

  // Se não tem event_id na query, redireciona para home
  if (!eventId) {
    redirect('/')
  }

  // Busca evento e sabores do servidor
  const client = getServerClient()
  const { data: event, error: eventError } = await client
    .from('events')
    .select(
      `
      id, name, slug, is_active, tempo_medio_preparo_global,
      flavors (
        id, name, category, tempo_medio_preparo,
        flavor_ingredients (
          ingredient_id,
          ingredients (id, name)
        )
      )
    `
    )
    .eq('id', eventId)
    .eq('is_active', true)
    .single()

  if (eventError || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Evento não está ativo</h1>
          <p className="text-muted-foreground">Acesse o QR code do evento para fazer seu pedido.</p>
        </div>
      </div>
    )
  }

  // Formata dados para o cliente
  const formattedEvent = {
    id: (event as any).id,
    name: (event as any).name,
    slug: (event as any).slug,
    tempo_medio_preparo_global: (event as any).tempo_medio_preparo_global,
    flavors: ((event as any).flavors || []).map((flavor: any) => ({
      id: flavor.id,
      name: flavor.name,
      category: flavor.category,
      tempo_medio_preparo: flavor.tempo_medio_preparo,
      ingredients: (flavor.flavor_ingredients || []).map((fi: any) => ({
        id: fi.ingredient_id,
        name: fi.ingredients?.name || '',
      })),
    })),
  }

  return (
    <div className="min-h-dvh bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{formattedEvent.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">Preencha seu pedido abaixo</p>
        </div>

        <OrderForm event={formattedEvent} />
      </div>
    </div>
  )
}
