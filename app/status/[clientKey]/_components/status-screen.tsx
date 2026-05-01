'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatOrderIdentifier } from '@/lib/domain/identifier'

interface Order {
  id: string
  sequence_number: number
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  first_name: string
  last_name: string
  flavor_id: string
  observation: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  flavors: { id: string; name: string; category: string } | null
}

const statusConfig = {
  pending: {
    label: 'Na fila',
    color: 'bg-yellow-100 text-yellow-800',
    badge: 'default',
  },
  in_progress: {
    label: 'Em preparo',
    color: 'bg-blue-100 text-blue-800',
    badge: 'default',
  },
  done: {
    label: 'Pronto!',
    color: 'bg-green-100 text-green-800',
    badge: 'default',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    badge: 'destructive',
  },
}

interface StatusScreenProps {
  clientKey: string
  initialOrder: any
}

export function StatusScreen({ clientKey, initialOrder }: StatusScreenProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Subscribe a Realtime updates
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
          setOrder(updated)

          // Vibrate e play sound se ficou pronto
          if (updated.status === 'done' && order.status !== 'done') {
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200])
            }
            // TODO: play audio notification
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
  }, [clientKey, order.status])

  // Timer para elapsed time
  useEffect(() => {
    if (order.status !== 'in_progress' || !order.started_at) return

    const interval = setInterval(() => {
      const started = new Date(order.started_at!).getTime()
      const now = new Date().getTime()
      setElapsedSeconds(Math.floor((now - started) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [order.status, order.started_at])

  const identifier = formatOrderIdentifier(
    order.first_name,
    order.last_name,
    order.sequence_number
  )

  const statusInfo = statusConfig[order.status]
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-dvh bg-background p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{identifier}</h1>
          <p className="text-muted-foreground text-sm mt-2">Seu pedido</p>
        </div>

        {/* Status Card */}
        <Card className="p-6 text-center">
          <div className={`inline-block rounded-lg px-4 py-2 mb-4 ${statusInfo.color}`}>
            <p className="text-sm font-semibold">{statusInfo.label}</p>
          </div>

          {order.status === 'pending' && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Você está na fila</p>
              <p>Será chamado em breve</p>
            </div>
          )}

          {order.status === 'in_progress' && (
            <div>
              <p className="text-2xl font-bold text-primary mb-2">{formatTime(elapsedSeconds)}</p>
              <p className="text-sm text-muted-foreground">Tempo em preparo</p>
            </div>
          )}

          {order.status === 'done' && (
            <div className="space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <p className="text-lg font-semibold mb-2">PRONTO!</p>
                <p className="text-sm text-muted-foreground">
                  Seu {order.flavors?.name.toLowerCase()} está pronto
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Retire no balcão
                </p>
              </div>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Seu pedido foi cancelado</p>
              {order.observation && (
                <p className="text-xs">Motivo: {order.observation}</p>
              )}
            </div>
          )}
        </Card>

        {/* Order Details */}
        <Card className="p-4 space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">SABOR</p>
            <p className="text-sm font-medium">{order.flavors?.name}</p>
          </div>

          {order.observation && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">OBSERVAÇÕES</p>
              <p className="text-sm">{order.observation}</p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">CRIADO EM</p>
            <p className="text-sm">
              {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </Card>

        {/* Hidden auto-refresh fallback */}
        {order.status !== 'done' && order.status !== 'cancelled' && (
          <p className="text-center text-xs text-muted-foreground">
            Atualizando em tempo real...
          </p>
        )}
      </div>
    </div>
  )
}
