import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { serializeOrdersToCsv, OrderCsvRecord } from '@/lib/utils/csv'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const client = getServerClient()
    const params = request.nextUrl.searchParams

    let eventId = params.get('event_id')
    if (!eventId) {
      const { data: event } = await client
        .from('events')
        .select('id, slug')
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

    if (fromDate) query = query.gte('finished_at', fromDate)
    if (toDate) query = query.lte('finished_at', toDate)

    const { data: orders, error } = await query

    if (error) {
      return NextResponse.json({ error: 'database_error' }, { status: 500 })
    }

    const { data: ingredients } = await client
      .from('ingredients')
      .select('id, name')
      .eq('event_id', eventId!)

    const ingredientMap = new Map(
      (ingredients as any[] || []).map((i: any) => [i.id, i.name])
    )

    const { data: eventData } = await client
      .from('events')
      .select('slug, name')
      .eq('id', eventId!)
      .single<any>()

    const records: OrderCsvRecord[] = (orders as any[]).map((order) => ({
      sequence_number: order.sequence_number,
      first_name: order.first_name,
      last_name: order.last_name,
      flavor_name: (order.flavors as any)?.name || '',
      ingredient_names: (order.ingredient_ids || []).map(
        (id: string) => ingredientMap.get(id) || id
      ),
      observation: order.observation,
      status: order.status,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at,
      started_at: order.started_at,
      finished_at: order.finished_at,
      duration_seconds:
        order.started_at && order.finished_at
          ? Math.round(
              (new Date(order.finished_at).getTime() -
                new Date(order.started_at).getTime()) /
                1000
            )
          : null,
    }))

    const csv = serializeOrdersToCsv(records)
    const slug = (eventData as any)?.slug || 'evento'
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `festa-${slug}-${dateStr}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('GET /api/export/csv error:', error)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
