import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { calculateQueuePosition } from '@/lib/domain/queue'
import { estimateWaitSecondsSimple } from '@/lib/domain/estimate'
import { Order } from '@/lib/domain/order'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const clientKey = request.nextUrl.searchParams.get('client_key')
    if (!clientKey) {
      return NextResponse.json({ error: 'client_key_required' }, { status: 400 })
    }

    const client = getServerClient()

    const { data: order } = await client
      .from('orders')
      .select('id, event_id, client_key, sequence_number, status, flavor_id, created_at')
      .eq('client_key', clientKey)
      .single<any>()

    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ status: order.status, queue_position: null, estimated_wait_seconds: null })
    }

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

    const globalPrepTime = (event as any)?.tempo_medio_preparo_global || 300
    const domainOrder = {
      ...order,
      first_name: '',
      last_name: '',
      ingredient_ids: [],
      observation: null,
      cancellation_reason: null,
      started_at: null,
      finished_at: null,
    } as Order
    const domainOrders = ((allOrders as any[]) || []).map((o: any) => ({
      ...o,
      cancellation_reason: o.cancellation_reason || null,
    })) as Order[]

    const pos = calculateQueuePosition(domainOrder, domainOrders)
    const queuePosition = pos !== null ? pos + 1 : null
    const estimatedWait = queuePosition !== null
      ? estimateWaitSecondsSimple(domainOrder, domainOrders, globalPrepTime)
      : null

    return NextResponse.json({
      status: order.status,
      queue_position: queuePosition,
      estimated_wait_seconds: estimatedWait,
    })
  } catch (error) {
    console.error('GET queue-position error:', error)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
