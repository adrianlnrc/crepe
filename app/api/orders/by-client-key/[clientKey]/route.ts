import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { calculateQueuePosition } from '@/lib/domain/queue'
import { estimateWaitSecondsSimple } from '@/lib/domain/estimate'
import { Order } from '@/lib/domain/order'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { clientKey: string } }
) {
  try {
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
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }

    const order = orderData as any

    const { data: event } = await client
      .from('events')
      .select('id, name, tempo_medio_preparo_global')
      .eq('id', order.event_id)
      .single<any>()

    const globalPrepTime = (event as any)?.tempo_medio_preparo_global || 300

    let queuePosition: number | null = null
    let estimatedWaitSeconds: number | null = null

    if (order.status === 'pending') {
      const { data: allOrders } = await (client as any)
        .from('orders')
        .select('id, event_id, client_key, sequence_number, status, first_name, last_name, flavor_id, ingredient_ids, observation, cancellation_reason, created_at, started_at, finished_at')
        .eq('event_id', order.event_id)
        .in('status', ['pending', 'in_progress'])

      if (allOrders) {
        const domainOrder = { ...order, cancellation_reason: order.cancellation_reason || null } as Order
        const domainOrders = (allOrders as any[]).map((o: any) => ({
          ...o,
          cancellation_reason: o.cancellation_reason || null,
        })) as Order[]

        const pos = calculateQueuePosition(domainOrder, domainOrders)
        if (pos !== null) {
          queuePosition = pos + 1
          estimatedWaitSeconds = estimateWaitSecondsSimple(domainOrder, domainOrders, globalPrepTime)
        }
      }
    }

    return NextResponse.json({
      order,
      queue_position: queuePosition,
      estimated_wait_seconds: estimatedWaitSeconds,
      tempo_medio_preparo_global: globalPrepTime,
    })
  } catch (error) {
    console.error('GET by-client-key error:', error)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
