import { Card } from '@/components/ui/card'

interface CancelledNoticeProps {
  cancellationReason: string | null
}

export function CancelledNotice({ cancellationReason }: CancelledNoticeProps) {
  return (
    <Card className="p-6 border-red-200 bg-red-50 text-center">
      <div className="text-4xl mb-3">❌</div>
      <h2 className="text-lg font-semibold text-red-800 mb-2">Pedido cancelado</h2>
      {cancellationReason ? (
        <p className="text-sm text-red-700 mb-3">Motivo: {cancellationReason}</p>
      ) : (
        <p className="text-sm text-red-600 mb-3">
          Seu pedido foi cancelado pela cozinha.
        </p>
      )}
      <p className="text-xs text-red-500">
        Procure a cozinha se tiver dúvidas.
      </p>
    </Card>
  )
}
