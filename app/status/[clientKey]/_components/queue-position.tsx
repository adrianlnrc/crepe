'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { formatWaitTime } from '@/lib/domain/estimate'

interface QueuePositionProps {
  clientKey: string
  initialPosition: number | null
  initialEstimatedWait: number | null
}

export function QueuePosition({ clientKey, initialPosition, initialEstimatedWait }: QueuePositionProps) {
  const [position, setPosition] = useState(initialPosition)
  const [estimatedWait, setEstimatedWait] = useState(initialEstimatedWait)

  const fetchPosition = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/queue-position?client_key=${clientKey}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status === 'pending') {
        setPosition(data.queue_position)
        setEstimatedWait(data.estimated_wait_seconds)
      }
    } catch {}
  }, [clientKey])

  // Polling a cada 10s
  useEffect(() => {
    const interval = setInterval(fetchPosition, 10_000)
    return () => clearInterval(interval)
  }, [fetchPosition])

  if (position === null) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p>Calculando posição na fila...</p>
      </div>
    )
  }

  const ordinal = position === 1 ? '1º' : `${position}º`

  return (
    <div className="text-center space-y-3">
      <div>
        <p className="text-5xl font-black text-primary">{ordinal}</p>
        <p className="text-base text-muted-foreground mt-1">
          {position === 1 ? 'próximo na fila' : 'na fila'}
        </p>
      </div>

      {estimatedWait !== null && estimatedWait > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Tempo estimado: ~{formatWaitTime(estimatedWait)}</span>
        </div>
      )}
    </div>
  )
}
