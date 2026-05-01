import { Order, isInQueue } from './order'
import { countAheadInQueue } from './queue'

export interface FlavorMetadata {
  id: string
  tempo_medio_preparo: number | null
}

// Estima tempo de espera em segundos baseado na fila
// Estratégia: tempo dos pedidos à frente + tempo do próprio pedido
export function estimateWaitSeconds(
  targetOrder: Order,
  allOrders: Order[],
  flavors: Map<string, FlavorMetadata>
): number {
  // Se não está na fila, retorna 0
  if (!isInQueue(targetOrder)) {
    return 0
  }

  // Pega flavor do pedido target
  const targetFlavor = flavors.get(targetOrder.flavor_id)
  const targetPrepTime = targetFlavor?.tempo_medio_preparo || 300 // Fallback 5 min

  // Conta pedidos à frente
  const aheadCount = countAheadInQueue(targetOrder, allOrders)
  if (aheadCount === 0) {
    // É o primeiro: só conta tempo do próprio preparo
    return targetPrepTime
  }

  // Pedidos à frente: sum(tempo_preparo) + targetPrepTime
  const queuedOrders = allOrders.filter(isInQueue)
  const sorted = [...queuedOrders].sort((a, b) => {
    if (a.sequence_number !== b.sequence_number) {
      return a.sequence_number - b.sequence_number
    }
    return a.id.localeCompare(b.id)
  })

  let totalSeconds = 0
  for (let i = 0; i < aheadCount; i++) {
    const order = sorted[i]
    const flavor = flavors.get(order.flavor_id)
    const prepTime = flavor?.tempo_medio_preparo || 300
    totalSeconds += prepTime
  }

  // Adiciona tempo do próprio pedido
  totalSeconds += targetPrepTime

  return totalSeconds
}

// Versão simplificada que usa apenas o tempo médio global
export function estimateWaitSecondsSimple(
  targetOrder: Order,
  allOrders: Order[],
  globalAvgPrepTime: number = 300
): number {
  if (!isInQueue(targetOrder)) {
    return 0
  }

  const aheadCount = countAheadInQueue(targetOrder, allOrders)
  return (aheadCount + 1) * globalAvgPrepTime
}

// Converte segundos para formato legível (ex: "12 min", "1h 5 min")
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes} min`
}
