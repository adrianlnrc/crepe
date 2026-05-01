import { Order, isInQueue } from './order'

// Calcula a posição de um pedido na fila (0-indexed)
// Usa sequence_number como critério principal, id como tie-breaker
export function calculateQueuePosition(
  targetOrder: Order,
  allOrders: Order[]
): number | null {
  // Se não está na fila, retorna null
  if (!isInQueue(targetOrder)) {
    return null
  }

  // Filtra pedidos que estão na fila (pending ou in_progress)
  const queuedOrders = allOrders.filter(isInQueue)

  // Ordena por sequence_number asc, depois por id asc (para quebra de empate)
  const sorted = [...queuedOrders].sort((a, b) => {
    if (a.sequence_number !== b.sequence_number) {
      return a.sequence_number - b.sequence_number
    }
    return a.id.localeCompare(b.id)
  })

  // Encontra índice do pedido target
  const index = sorted.findIndex((o) => o.id === targetOrder.id)
  return index >= 0 ? index : null
}

// Conta quantos pedidos estão à frente na fila
export function countAheadInQueue(
  targetOrder: Order,
  allOrders: Order[]
): number {
  const position = calculateQueuePosition(targetOrder, allOrders)
  return position !== null ? position : 0
}

// Determina se um pedido é o próximo a ser processado
export function isNextInQueue(
  targetOrder: Order,
  allOrders: Order[]
): boolean {
  return calculateQueuePosition(targetOrder, allOrders) === 0
}

// Retorna os N próximos pedidos da fila (para exibição na cozinha)
export function getUpcomingQueue(
  allOrders: Order[],
  limit: number = 10
): Order[] {
  const queuedOrders = allOrders.filter(isInQueue)
  return queuedOrders
    .sort((a, b) => {
      if (a.sequence_number !== b.sequence_number) {
        return a.sequence_number - b.sequence_number
      }
      return a.id.localeCompare(b.id)
    })
    .slice(0, limit)
}
