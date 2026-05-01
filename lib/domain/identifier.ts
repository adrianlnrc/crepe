import { Order } from './order'

// Formata identificador do pedido para exibição (ex: "Maria #42")
// Usa primeiro nome + sequence_number para fácil identificação verbal
export function formatOrderIdentifier(order: Order): string {
  return `${order.first_name} #${order.sequence_number}`
}

// Formata nome completo
export function formatFullName(order: Order): string {
  return `${order.first_name} ${order.last_name}`
}

// Extrai just o número para exibição numérica (ex: "42")
export function formatSequenceNumber(order: Order): string {
  return order.sequence_number.toString()
}

// Valida que um identifier é bem-formado
export function isValidOrderIdentifier(identifier: string): boolean {
  // Formato esperado: "Name #123"
  const pattern = /^.+\s#\d+$/
  return pattern.test(identifier)
}
