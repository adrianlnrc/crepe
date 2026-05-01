import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { createOrderSchema, CreateOrderInput } from '@/lib/validation/order-schema'
import { formatOrderIdentifier } from '@/lib/domain/identifier'
import { isSamePayload } from '@/lib/domain/idempotency'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Valida schema
    const validation = createOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const input = validation.data
    const client = getServerClient()

    // Verifica que evento existe e está ativo
    const { data: event } = await client
      .from('events')
      .select('id, is_active')
      .eq('id', input.event_id)
      .single<{ id: string; is_active: boolean }>()

    if (!event || !event.is_active) {
      return NextResponse.json(
        { error: 'event_not_found' },
        { status: 404 }
      )
    }

    // Tenta inserir novo pedido (idempotente por client_key)
    const insertPayload: any = {
      event_id: input.event_id,
      client_key: input.client_key,
      first_name: input.first_name,
      last_name: input.last_name,
      flavor_id: input.flavor_id,
      ingredient_ids: input.ingredient_ids || [],
      observation: input.observation,
    }

    const { data: newOrder, error: insertError } = await ((client as any)
      .from('orders')
      .insert(insertPayload)
      .select()
      .single())

    // Se insert bem-sucedido: retorna 201
    if (newOrder) {
      const identifier = formatOrderIdentifier(
        (newOrder as any).first_name,
        (newOrder as any).last_name,
        (newOrder as any).sequence_number
      )

      return NextResponse.json(
        {
          order: newOrder,
          identifier,
        },
        { status: 201 }
      )
    }

    // Se falhou por constraint UNIQUE no client_key: busca pedido existente
    if (insertError?.code === '23505') {
      const { data: existingOrder } = await client
        .from('orders')
        .select()
        .eq('client_key', input.client_key)
        .single<any>()

      if (!existingOrder) {
        return NextResponse.json(
          { error: 'unknown_error' },
          { status: 500 }
        )
      }

      // Compara payload: mesmos dados = idempotent OK, dados diferentes = erro 409
      if (isSamePayload(input, {
        event_id: (existingOrder as any).event_id,
        client_key: (existingOrder as any).client_key,
        flavor_id: (existingOrder as any).flavor_id,
        first_name: (existingOrder as any).first_name,
        last_name: (existingOrder as any).last_name,
        ingredient_ids: (existingOrder as any).ingredient_ids,
        observation: (existingOrder as any).observation,
      } as CreateOrderInput)) {
        // Payload idêntico: retorna 200 (idempotent)
        const identifier = formatOrderIdentifier(
          (existingOrder as any).first_name,
          (existingOrder as any).last_name,
          (existingOrder as any).sequence_number
        )

        return NextResponse.json(
          {
            order: existingOrder,
            identifier,
          },
          { status: 200 }
        )
      } else {
        // Payload diferente, client_key reutilizado: erro
        return NextResponse.json(
          { error: 'client_key_reused' },
          { status: 409 }
        )
      }
    }

    // Outro erro do banco
    console.error('Insert order error:', insertError)
    return NextResponse.json(
      { error: 'database_error' },
      { status: 500 }
    )
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    )
  }
}

// GET /api/orders para cozinha (lista pedidos na fila)
export async function GET(request: NextRequest) {
  try {
    // Protegida pelo middleware
    const client = getServerClient()

    // Query params
    const searchParams = request.nextUrl.searchParams
    const statuses = searchParams.get('status')?.split(',') || ['pending', 'in_progress']
    const eventId = searchParams.get('event_id') // Optional: filtrar por evento específico

    let query = client
      .from('orders')
      .select(
        `
        id, sequence_number, first_name, last_name, flavor_id, ingredient_ids, observation, status, created_at,
        flavors (id, name, category, tempo_medio_preparo)
      `
      )
      .in('status', statuses)
      .order('sequence_number', { ascending: true })
      .order('id', { ascending: true })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: orders, error } = await query.returns<any>()

    if (error) {
      console.error('GET /api/orders error:', error)
      return NextResponse.json(
        { error: 'database_error' },
        { status: 500 }
      )
    }

    // Formata resposta com identificador e sabor aninhado
    const formatted = (orders as any[]).map((order) => ({
      id: order.id,
      sequence_number: order.sequence_number,
      first_name: order.first_name,
      last_name: order.last_name,
      flavor: order.flavors,
      ingredient_ids: order.ingredient_ids,
      observation: order.observation,
      status: order.status,
      created_at: order.created_at,
      identifier: formatOrderIdentifier(
        order.first_name,
        order.last_name,
        order.sequence_number
      ),
    }))

    return NextResponse.json({ orders: formatted })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    )
  }
}
