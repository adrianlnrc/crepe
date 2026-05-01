import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const client = getServerClient()
    const params = request.nextUrl.searchParams

    // Busca evento ativo se event_id não especificado
    let eventId = params.get('event_id')
    if (!eventId) {
      const { data: event } = await client
        .from('events')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single<any>()

      if (!event) {
        return NextResponse.json({ error: 'no_active_event' }, { status: 404 })
      }
      eventId = event.id
    }

    const fromDate = params.get('from')
    const toDate = params.get('to')
    const statusFilter = params.get('status')?.split(',') || ['done', 'cancelled']

    let query = (client as any)
      .from('orders')
      .select(`
        id, sequence_number, first_name, last_name,
        flavor_id, ingredient_ids, observation, cancellation_reason,
        status, created_at, started_at, finished_at,
        flavors (id, name, category)
      `)
      .eq('event_id', eventId)
      .in('status', statusFilter)
      .order('finished_at', { ascending: false })

    if (fromDate) {
      query = query.gte('finished_at', fromDate)
    }
    if (toDate) {
      query = query.lte('finished_at', toDate)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('GET /api/history error:', error)
      return NextResponse.json({ error: 'database_error' }, { status: 500 })
    }

    // Busca ingredientes do evento para mapear ids → nomes
    const { data: ingredients } = await client
      .from('ingredients')
      .select('id, name')
      .eq('event_id', eventId!)

    const ingredientMap = new Map(
      (ingredients as any[] || []).map((i: any) => [i.id, i.name])
    )

    const enrichedOrders = (orders as any[]).map((order) => ({
      ...order,
      ingredient_names: (order.ingredient_ids || []).map(
        (id: string) => ingredientMap.get(id) || id
      ),
      duration_seconds:
        order.started_at && order.finished_at
          ? Math.round(
              (new Date(order.finished_at).getTime() -
                new Date(order.started_at).getTime()) /
                1000
            )
          : null,
    }))

    return NextResponse.json({ orders: enrichedOrders, event_id: eventId })
  } catch (error) {
    console.error('GET /api/history error:', error)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
