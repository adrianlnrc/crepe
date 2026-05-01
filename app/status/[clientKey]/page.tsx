import { getServerClient } from '@/lib/supabase/server'
import { StatusScreen } from './_components/status-screen'
import { calculateQueuePosition } from '@/lib/domain/queue'
import { estimateWaitSecondsSimple } from '@/lib/domain/estimate'
import { Order } from '@/lib/domain/order'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Status do Pedido',
  description: 'Acompanhe o status do seu pedido em tempo real',
}

export default async function StatusPage({
  params,
}: {
  params: { clientKey: string }
}) {
  const { clientKey } = params
  const client = getServerClient()

  const { data: orderData } = await (client as any)
    .from('orders')
    .select(`
      id, event_id, client_key, sequence_number, status,
      first_name, last_name, flavor_id, ingredient_ids,
      observation, cancellation_reason, created_at, started_at, finished_at,
      flavors (id, name, category, tempo_medio_preparo)
    `)
    .eq('client_key', clientKey)
    .single()

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Pedido não encontrado</h1>
          <p className="text-muted-foreground">
            Escaneie o QR code para fazer um novo pedido.
          </p>
        </div>
      </div>
    )
  }

  const order = orderData as any

  let queuePosition: number | null = null
  let estimatedWait: number | null = null

  if (order.status === 'pending') {
    const { data: event } = await client
      .from('events')
      .select('tempo_medio_preparo_global')
      .eq('id', order.event_id)
      .single<any>()

    const { data: allOrders } = await (client as any)
      .from('orders')
      .select('id, event_id, client_key, sequence_number, status, first_name, last_name, flavor_id, ingredient_ids, observation, cancellation_reason, created_at, started_at, finished_at')
      .eq('event_id', order.event_id)
      .in('status', ['pending', 'in_progress'])

    if (allOrders) {
      const globalPrepTime = (event as any)?.tempo_medio_preparo_global || 300
      const domainOrder = { ...order, cancellation_reason: order.cancellation_reason || null } as Order
      const domainOrders = (allOrders as any[]).map((o: any) => ({
        ...o,
        cancellation_reason: o.cancellation_reason || null,
      })) as Order[]

      const pos = calculateQueuePosition(domainOrder, domainOrders)
      if (pos !== null) {
        queuePosition = pos + 1
        estimatedWait = estimateWaitSecondsSimple(domainOrder, domainOrders, globalPrepTime)
      }
    }
  }

  return (
    <StatusScreen
      clientKey={clientKey}
      initialOrder={order}
      initialQueuePosition={queuePosition}
      initialEstimatedWait={estimatedWait}
    />
  )
}
