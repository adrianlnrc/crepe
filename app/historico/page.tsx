import { Suspense } from 'react'
import { getServerClient } from '@/lib/supabase/server'
import { HistoryTable } from './_components/history-table'
import { HistoryFilters } from './_components/history-filters'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Histórico de Pedidos',
  description: 'Pedidos finalizados do evento',
}

interface PageProps {
  searchParams: {
    from?: string
    to?: string
    status?: string
    event_id?: string
  }
}

async function HistoryContent({ searchParams }: PageProps) {
  const client = getServerClient()

  let eventId = searchParams.event_id
  if (!eventId) {
    const { data: event } = await client
      .from('events')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single<any>()

    if (!event) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhum evento ativo encontrado.</p>
        </div>
      )
    }
    eventId = event.id
  }

  const statusFilter = searchParams.status?.split(',') || ['done', 'cancelled']

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

  if (searchParams.from) query = query.gte('finished_at', searchParams.from)
  if (searchParams.to) query = query.lte('finished_at', searchParams.to)

  const { data: orders } = await query

  const { data: ingredients } = await client
    .from('ingredients')
    .select('id, name')
    .eq('event_id', eventId!)

  const ingredientMap = new Map(
    (ingredients as any[] || []).map((i: any) => [i.id, i.name])
  )

  const enrichedOrders = (orders as any[] || []).map((order: any) => ({
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

  return (
    <>
      <HistoryFilters totalCount={enrichedOrders.length} />
      <div className="mt-6">
        <HistoryTable orders={enrichedOrders} />
      </div>
    </>
  )
}

export default function HistoricoPage(props: PageProps) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">📋 Histórico de Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos finalizados e cancelados do evento
          </p>
        </div>

        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
          <HistoryContent {...props} />
        </Suspense>
      </div>
    </div>
  )
}
