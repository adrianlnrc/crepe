import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { OrderForm } from './_components/order-form'
import { Lora } from 'next/font/google'

export const metadata = {
  title: 'Faça seu Pedido',
  description: 'Preencha seu pedido de crepe',
}

const lora = Lora({ subsets: ['latin'], weight: ['700'] })

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: { event?: string }
}) {
  const eventId = searchParams.event

  if (!eventId) {
    redirect('/')
  }

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
      <div className="min-h-dvh bg-gradient-to-b from-orange-50 to-amber-50/40 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-orange-900 mb-2">Evento não está ativo</h1>
          <p className="text-orange-700/60 text-sm">Acesse o QR code do evento para fazer seu pedido.</p>
        </div>
      </div>
    )
  }

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
    <div className="min-h-dvh bg-gradient-to-b from-orange-50 to-amber-50/40">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">

        {/* Header */}
        <header className="text-center mb-10">
          <div className="text-6xl mb-4 inline-block animate-bounce"
            style={{ animationDuration: '2s', animationIterationCount: '2' }}>
            🥞
          </div>
          <h1
            className={`${lora.className} text-4xl font-bold text-orange-900 leading-tight`}
          >
            {formattedEvent.name}
          </h1>
          <p className="text-orange-700/50 text-xs font-semibold tracking-widest uppercase mt-2">
            Monte seu pedido
          </p>
        </header>

        <OrderForm event={formattedEvent} />
      </div>
    </div>
  )
}
