import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { orderTransitionSchema } from '@/lib/validation/order-schema'
import { isValidTransition } from '@/lib/domain/order'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()

    // Valida schema
    const validation = orderTransitionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { to_status, reason } = validation.data

    const client = getServerClient()

    // Busca pedido atual
    const { data: currentOrder, error: selectError } = await client
      .from('orders')
      .select()
      .eq('id', orderId)
      .single<any>()

    if (selectError || !currentOrder) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      )
    }

    // Valida transição
    if (!isValidTransition((currentOrder as any).status, to_status)) {
      return NextResponse.json(
        { error: 'invalid_transition' },
        { status: 422 }
      )
    }

    // Atualiza com race guard: UPDATE ... WHERE status = current RETURNING *
    const updatePayload: any = {
      status: to_status,
      started_at:
        to_status === 'in_progress'
          ? new Date().toISOString()
          : (currentOrder as any).started_at,
      finished_at:
        to_status === 'done' || to_status === 'cancelled'
          ? new Date().toISOString()
          : (currentOrder as any).finished_at,
    }

    const { data: updatedOrder, error: updateError } = await ((client as any)
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .eq('status', (currentOrder as any).status) // Race guard
      .select()
      .single())

    // Se update falhou com zero rows: race condition ou já no status target
    if (updateError) {
      // Verifica status atual
      const { data: checkOrder } = await client
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single<any>()

      if ((checkOrder as any)?.status === to_status) {
        // Já está no status: retorna 200 (idempotent)
        return NextResponse.json({ ok: true })
      } else {
        // Race condition: outro cliente mudou o status
        return NextResponse.json(
          { error: 'transition_race' },
          { status: 409 }
        )
      }
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'unknown_error' },
        { status: 500 }
      )
    }

    // Registra transição no log
    await client.from('order_transitions').insert({
      order_id: orderId,
      from_status: (currentOrder as any).status,
      to_status,
      actor: 'kitchen',
      reason: reason || null,
    } as any)

    return NextResponse.json({
      order: updatedOrder,
      transition: {
        id: 0, // Será gerado pelo DB
        from_status: currentOrder.status,
        to_status,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('POST /api/orders/[id]/transition error:', error)
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    )
  }
}
