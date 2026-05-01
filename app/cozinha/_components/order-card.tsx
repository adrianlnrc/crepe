'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatOrderIdentifier } from '@/lib/domain/identifier'
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'

interface OrderCardProps {
  id: string
  sequence_number: number
  first_name: string
  last_name: string
  flavor: {
    id: string
    name: string
    category: string
    tempo_medio_preparo: number | null
  }
  ingredient_ids: string[]
  observation: string | null
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  created_at: string
  started_at: string | null
  onTransition: (orderId: string, status: string) => Promise<void>
  onCancel: (orderId: string) => void
  disabled?: boolean
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function OrderCard({
  id,
  sequence_number,
  first_name,
  last_name,
  flavor,
  ingredient_ids,
  observation,
  status,
  created_at,
  started_at,
  onTransition,
  onCancel,
  disabled,
}: OrderCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [waitMinutes, setWaitMinutes] = useState(0)

  useEffect(() => {
    if (status !== 'pending') return
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000)
      setWaitMinutes(diff)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [status, created_at])

  const identifier = formatOrderIdentifier(first_name, last_name, sequence_number)

  // Timer para elapsed time
  useEffect(() => {
    if (status !== 'in_progress' || !started_at) return

    setElapsedSeconds(Math.floor((new Date().getTime() - new Date(started_at).getTime()) / 1000))

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [status, started_at])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTransition = async (toStatus: string) => {
    setIsLoading(true)
    try {
      await onTransition(id, toStatus)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`p-4 border-2 transition-colors ${
      status === 'in_progress' ? 'border-blue-300 bg-blue-50' : ''
    }`}>
      <div className="space-y-3">
        {/* Header: Identifier + Status Badge */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{identifier}</h3>
            <p className="text-sm text-muted-foreground">{flavor.name}</p>
          </div>
          <Badge className={statusStyles[status]}>
            {status === 'pending' && 'Na fila'}
            {status === 'in_progress' && 'Em preparo'}
          </Badge>
        </div>

        {/* Prep time estimate */}
        {flavor.tempo_medio_preparo && status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            ~{Math.round(flavor.tempo_medio_preparo / 60)} min
          </div>
        )}

        {/* Wait time in queue */}
        {status === 'pending' && (
          <p className={`text-xs mt-1 ${
            flavor.tempo_medio_preparo && waitMinutes > flavor.tempo_medio_preparo * 2 / 60
              ? 'text-orange-500 font-semibold'
              : 'text-muted-foreground'
          }`}>
            Na fila há {waitMinutes < 1 ? 'menos de 1' : waitMinutes} min
          </p>
        )}

        {/* Elapsed time when in progress */}
        {status === 'in_progress' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Clock className="h-4 w-4" />
            {formatTime(elapsedSeconds)}
          </div>
        )}

        {/* Observation */}
        {observation && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm">
            <p className="text-xs text-amber-800 font-medium mb-1">Observação</p>
            <p className="text-amber-900">{observation}</p>
          </div>
        )}

        {/* Created time */}
        <div className="text-xs text-muted-foreground">
          {new Date(created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {status === 'pending' && (
            <Button
              onClick={() => handleTransition('in_progress')}
              disabled={isLoading || disabled}
              variant="default"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Iniciar
            </Button>
          )}

          {status === 'in_progress' && (
            <Button
              onClick={() => handleTransition('done')}
              disabled={isLoading || disabled}
              variant="default"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Finalizar
            </Button>
          )}

          <Button
            onClick={() => onCancel(id)}
            variant="outline"
            disabled={disabled || ['done', 'cancelled'].includes(status)}
            className="flex-1"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  )
}
