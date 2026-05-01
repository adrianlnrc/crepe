'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { OrderCard } from './order-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { LogOut } from 'lucide-react'

interface Order {
  id: string
  sequence_number: number
  first_name: string
  last_name: string
  flavor_id: string
  flavors: {
    id: string
    name: string
    category: string
    tempo_medio_preparo: number | null
  } | null
  ingredient_ids: string[]
  observation: string | null
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  created_at: string
  started_at: string | null
}

interface RealtimeOrdersListProps {
  eventId: string
  initialOrders: any[]
  initialDoneCount: number
}

export function RealtimeOrdersList({ eventId, initialOrders, initialDoneCount }: RealtimeOrdersListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Map<string, Order>>(
    new Map(initialOrders.map((o: any) => [o.id, o]))
  )
  const [doneCount, setDoneCount] = useState(initialDoneCount)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Subscribe to Realtime
  useEffect(() => {
    const client = getBrowserClient()

    const ch = client
      .channel(`kitchen:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `event_id=eq.${eventId}`,
        },
        (payload: any) => {
          const order = payload.new as Order

          // Se é inserção ou update de pedido na fila
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (['pending', 'in_progress'].includes(order.status)) {
              // Adiciona ou atualiza no mapa
              setOrders((prev) => {
                const existing = prev.get(order.id)
                const merged = { ...order, flavors: existing?.flavors ?? order.flavors ?? null }
                return new Map(prev).set(order.id, merged)
              })
            } else {
              // Remove se finalizou ou foi cancelado
              setOrders((prev) => {
                const next = new Map(prev)
                next.delete(order.id)
                return next
              })
              if (order.status === 'done') {
                setDoneCount((n) => n + 1)
              }
            }
          }
        }
      )
      .subscribe()

    setChannel(ch)

    return () => {
      if (ch) {
        client.removeChannel(ch)
      }
    }
  }, [eventId])

  // Re-sort orders by sequence_number
  const sortedOrders = Array.from(orders.values()).sort((a, b) => {
    if (a.sequence_number !== b.sequence_number) {
      return a.sequence_number - b.sequence_number
    }
    return a.id.localeCompare(b.id)
  })

  const handleTransition = async (orderId: string, toStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast({
          title: 'Erro',
          description: error.error === 'invalid_transition'
            ? 'Transição inválida para este estado'
            : 'Erro ao atualizar pedido',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Pedido atualizado',
        description: `Pedido movido para ${toStatus}`,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (orderId: string) => {
    setCancelingOrderId(orderId)
  }

  const confirmCancel = async () => {
    if (!cancelingOrderId) return

    try {
      const response = await fetch(`/api/orders/${cancelingOrderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: 'cancelled', reason: cancelReason || null }),
      })

      if (response.ok) {
        toast({
          title: 'Pedido cancelado',
          description: 'O convidado foi notificado',
        })
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao cancelar pedido',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    } finally {
      setCancelingOrderId(null)
      setCancelReason('')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/kitchen/logout', { method: 'POST' })
    router.push('/cozinha/login')
  }

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b p-4 sm:p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🍳 Painel da Cozinha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sortedOrders.filter((o) => o.status === 'in_progress').length} em preparo
            {' · '}
            {sortedOrders.filter((o) => o.status === 'pending').length} na fila
            {' · '}
            {doneCount} prontos ✓
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {sortedOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold mb-2">Nenhum pedido na fila</p>
              <p className="text-muted-foreground">Aguardando novos pedidos...</p>
            </Card>
          ) : (
            <>
              {/* In progress section */}
              {sortedOrders.some((o) => o.status === 'in_progress') && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground px-1">
                    EM PREPARO
                  </p>
                  {sortedOrders
                    .filter((o) => o.status === 'in_progress')
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        id={order.id}
                        sequence_number={order.sequence_number}
                        first_name={order.first_name}
                        last_name={order.last_name}
                        flavor={order.flavors || { id: '', name: 'Desconhecido', category: '', tempo_medio_preparo: null }}
                        ingredient_ids={order.ingredient_ids}
                        observation={order.observation}
                        status={order.status}
                        created_at={order.created_at}
                        started_at={order.started_at}
                        onTransition={handleTransition}
                        onCancel={handleCancel}
                      />
                    ))}
                </div>
              )}

              {/* Pending queue section */}
              {sortedOrders.some((o) => o.status === 'pending') && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground px-1">
                    NA FILA
                  </p>
                  {sortedOrders
                    .filter((o) => o.status === 'pending')
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        id={order.id}
                        sequence_number={order.sequence_number}
                        first_name={order.first_name}
                        last_name={order.last_name}
                        flavor={order.flavors || { id: '', name: 'Desconhecido', category: '', tempo_medio_preparo: null }}
                        ingredient_ids={order.ingredient_ids}
                        observation={order.observation}
                        status={order.status}
                        created_at={order.created_at}
                        started_at={order.started_at}
                        onTransition={handleTransition}
                        onCancel={handleCancel}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={!!cancelingOrderId} onOpenChange={() => setCancelingOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido?</DialogTitle>
            <DialogDescription>
              O convidado será notificado sobre o cancelamento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCancelingOrderId(null)}
              className="flex-1"
            >
              Não, manter
            </Button>
            <Button
              onClick={confirmCancel}
              variant="destructive"
              className="flex-1"
            >
              Sim, cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
