// Order domain logic - pure functions for state management

export type OrderStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'

export interface Order {
  id: string
  event_id: string
  client_key: string
  sequence_number: number
  status: OrderStatus
  first_name: string
  last_name: string
  flavor_id: string
  ingredient_ids: string[]
  observation: string | null
  cancellation_reason: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

// Estado válido de transições baseado na máquina de estados de pedidos
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
}

export function isValidTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  return validTransitions[fromStatus].includes(toStatus)
}

export function getValidTransitionsFrom(status: OrderStatus): OrderStatus[] {
  return validTransitions[status]
}

// Determina se um pedido está na fila (sendo processado ou aguardando)
export function isInQueue(order: Order): boolean {
  return order.status === 'pending' || order.status === 'in_progress'
}

// Determina se um pedido foi finalizado
export function isFinalized(order: Order): boolean {
  return order.status === 'done' || order.status === 'cancelled'
}

// Descrever transição para logging
export function describeTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): string {
  const descriptions: Record<string, string> = {
    'pending->in_progress': 'Started preparation',
    'pending->cancelled': 'Cancelled before start',
    'in_progress->done': 'Ready for pickup',
    'in_progress->cancelled': 'Cancelled during preparation',
  }
  return descriptions[`${fromStatus}->${toStatus}`] || 'Status changed'
}
