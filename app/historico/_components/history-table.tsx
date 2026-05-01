import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatOrderIdentifier } from '@/lib/domain/identifier'

interface HistoryOrder {
  id: string
  sequence_number: number
  first_name: string
  last_name: string
  flavors: { name: string } | null
  ingredient_names: string[]
  observation: string | null
  cancellation_reason: string | null
  status: string
  created_at: string
  started_at: string | null
  finished_at: string | null
  duration_seconds: number | null
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function HistoryTable({ orders }: { orders: HistoryOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-muted-foreground">Nenhum pedido encontrado com esses filtros.</p>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Convidado</th>
              <th className="px-4 py-3 text-left font-medium">Sabor</th>
              <th className="px-4 py-3 text-left font-medium">Ingredientes</th>
              <th className="px-4 py-3 text-left font-medium">Obs.</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Criado</th>
              <th className="px-4 py-3 text-left font-medium">Finalizado</th>
              <th className="px-4 py-3 text-left font-medium">Duração</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const identifier = formatOrderIdentifier(
                order.first_name,
                order.last_name,
                order.sequence_number
              )
              return (
                <tr key={order.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">#{order.sequence_number}</td>
                  <td className="px-4 py-3 font-medium">{identifier}</td>
                  <td className="px-4 py-3">{order.flavors?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {order.ingredient_names.length > 0
                      ? order.ingredient_names.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                    {order.observation || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        order.status === 'done'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {order.status === 'done' ? 'Finalizado' : 'Cancelado'}
                    </Badge>
                    {order.cancellation_reason && (
                      <p className="text-xs text-muted-foreground mt-1">{order.cancellation_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{formatTime(order.created_at)}</td>
                  <td className="px-4 py-3 text-xs">{formatTime(order.finished_at)}</td>
                  <td className="px-4 py-3 text-xs">{formatDuration(order.duration_seconds)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {orders.map((order) => {
          const identifier = formatOrderIdentifier(
            order.first_name,
            order.last_name,
            order.sequence_number
          )
          return (
            <Card key={order.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{identifier}</p>
                  <p className="text-sm text-muted-foreground">{order.flavors?.name}</p>
                </div>
                <Badge
                  className={
                    order.status === 'done'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {order.status === 'done' ? 'Finalizado' : 'Cancelado'}
                </Badge>
              </div>
              {order.ingredient_names.length > 0 && (
                <p className="text-xs text-muted-foreground">{order.ingredient_names.join(', ')}</p>
              )}
              {order.observation && (
                <p className="text-xs italic text-muted-foreground">{order.observation}</p>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t">
                <span>Criado: {formatTime(order.created_at)}</span>
                <span>Finalizado: {formatTime(order.finished_at)}</span>
                {order.duration_seconds !== null && (
                  <span>Duração: {formatDuration(order.duration_seconds)}</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
