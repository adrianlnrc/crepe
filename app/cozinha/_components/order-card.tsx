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
  ingredients: string[]
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
  ingredients,
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
    const onVisible = () => { if (!document.hidden) update() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [status, created_at])

  const identifier = formatOrderIdentifier(first_name, last_name, sequence_number)

  // Timer recalcula a partir de started_at a cada tick — não acumula drift quando aba fica em background
  useEffect(() => {
    if (status !== 'in_progress' || !started_at) return

    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(started_at).getTime()) / 1000))
    }
    update()
    const interval = setInterval(update, 1000)
    const onVisible = () => { if (!document.hidden) update() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
    <Card className={`p-5 sm:p-6 border-2 transition-colors ${
      status === 'in_progress' ? 'border-blue-300 bg-blue-50' : ''
    }`}>
      <div className="space-y-4">

        {/* Cabeçalho: nome + badge */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black leading-tight">{identifier}</h3>
            <p className="text-base sm:text-lg text-muted-foreground font-medium mt-0.5">
              {flavor.name}
            </p>
          </div>
          <Badge className={`${statusStyles[status]} text-sm sm:text-base px-3 py-1 shrink-0`}>
            {status === 'pending' && 'Na fila'}
            {status === 'in_progress' && 'Em preparo'}
          </Badge>
        </div>

        {/* Ingredientes selecionados */}
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ingredients.map((name) => (
              <span
                key={name}
                className="inline-flex items-center text-sm sm:text-base bg-muted text-foreground
                           px-3 py-1 rounded-full font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Timer em preparo — destaque grande */}
        {status === 'in_progress' && (
          <div className="flex items-center gap-3 text-blue-600">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <span className="text-3xl sm:text-4xl font-black tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Tempo estimado + espera na fila */}
        {status === 'pending' && (
          <div className="flex items-center gap-4 flex-wrap">
            {flavor.tempo_medio_preparo && (
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                ~{Math.round(flavor.tempo_medio_preparo / 60)} min
              </div>
            )}
            <p className={`text-sm sm:text-base font-semibold ${
              flavor.tempo_medio_preparo && waitMinutes > flavor.tempo_medio_preparo * 2 / 60
                ? 'text-orange-500'
                : 'text-muted-foreground'
            }`}>
              Na fila há {waitMinutes < 1 ? 'menos de 1' : waitMinutes} min
            </p>
          </div>
        )}

        {/* Observação */}
        {observation && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs sm:text-sm text-amber-700 font-semibold uppercase tracking-wide mb-1">
              Observação
            </p>
            <p className="text-base sm:text-lg text-amber-900 font-medium">{observation}</p>
          </div>
        )}

        {/* Horário */}
        <div className="text-sm sm:text-base text-muted-foreground">
          {new Date(created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 pt-1">
          {status === 'pending' && (
            <Button
              onClick={() => handleTransition('in_progress')}
              disabled={isLoading || disabled}
              variant="default"
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Iniciar
            </Button>
          )}

          {status === 'in_progress' && (
            <Button
              onClick={() => handleTransition('done')}
              disabled={isLoading || disabled}
              variant="default"
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Finalizar
            </Button>
          )}

          <Button
            onClick={() => onCancel(id)}
            variant="outline"
            disabled={disabled || ['done', 'cancelled'].includes(status)}
            className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  )
}
