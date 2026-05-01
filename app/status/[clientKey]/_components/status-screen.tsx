'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { Card } from '@/components/ui/card'
import { formatOrderIdentifier } from '@/lib/domain/identifier'
import { QueuePosition } from './queue-position'
import { ReadyBanner } from './ready-banner'
import { CancelledNotice } from './cancelled-notice'
import { Clock } from 'lucide-react'

interface Order {
  id: string
  sequence_number: number
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  first_name: string
  last_name: string
  flavor_id: string
  observation: string | null
  cancellation_reason: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  flavors: { id: string; name: string; category: string } | null
}

interface StatusScreenProps {
  clientKey: string
  initialOrder: any
  initialQueuePosition: number | null
  initialEstimatedWait: number | null
}

export function StatusScreen({
  clientKey,
  initialOrder,
  initialQueuePosition,
  initialEstimatedWait,
}: StatusScreenProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Salva client_key no localStorage para retomada
  useEffect(() => {
    try {
      localStorage.setItem('crepe:lastClientKey', clientKey)
    } catch {}
  }, [clientKey])

  // Realtime subscription
  useEffect(() => {
    const client = getBrowserClient()

    const ch = client
      .channel(`order:${clientKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `client_key=eq.${clientKey}`,
        },
        (payload: any) => {
          const updated = payload.new as Order
          const prevStatus = order.status
          setOrder((prev) => ({ ...prev, ...updated }))

          if (updated.status === 'done' && prevStatus !== 'done') {
            try { navigator.vibrate?.([200, 100, 200]) } catch {}
          }
        }
      )
      .subscribe()

    return () => { client.removeChannel(ch) }
  }, [clientKey, order.status])

  // Timer para elapsed time (in_progress)
  useEffect(() => {
    if (order.status !== 'in_progress' || !order.started_at) return

    const update = () => {
      const started = new Date(order.started_at!).getTime()
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order.status, order.started_at])

  if (order.status === 'done') {
    const identifier = formatOrderIdentifier(order.first_name, order.last_name, order.sequence_number)
    return <ReadyBanner identifier={identifier} flavorName={order.flavors?.name || ''} />
  }

  const identifier = formatOrderIdentifier(order.first_name, order.last_name, order.sequence_number)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-dvh bg-background p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Identifier */}
        <Card className="p-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground mb-1 tracking-widest">SEU PEDIDO</p>
          <h1 className="text-3xl sm:text-4xl font-black">{identifier}</h1>
          {order.flavors && (
            <p className="text-muted-foreground text-sm mt-2">{order.flavors.name}</p>
          )}
        </Card>

        {/* Status */}
        <Card className="p-6">
          {order.status === 'pending' && (
            <QueuePosition
              clientKey={clientKey}
              initialPosition={initialQueuePosition}
              initialEstimatedWait={initialEstimatedWait}
            />
          )}

          {order.status === 'in_progress' && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                <p className="text-sm font-semibold">Em preparo</p>
              </div>
              <p className="text-3xl font-bold text-blue-700">{formatTime(elapsedSeconds)}</p>
              <p className="text-xs text-muted-foreground">tempo em preparo</p>
            </div>
          )}

          {order.status === 'cancelled' && (
            <CancelledNotice cancellationReason={order.cancellation_reason} />
          )}
        </Card>

        {/* Details */}
        {order.observation && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">OBSERVAÇÃO</p>
            <p className="text-sm">{order.observation}</p>
          </Card>
        )}

        {order.status !== 'cancelled' && (
          <p className="text-center text-xs text-muted-foreground">
            Atualizando em tempo real
          </p>
        )}
      </div>
    </div>
  )
}
