import { Order } from './order'

// Formata identificador do pedido para exibição (ex: "Maria Silva #042")
// Usa nome completo + sequence_number zero-padded (3 dígitos)
export function formatOrderIdentifier(
  firstName: string,
  lastName: string,
  sequenceNumber: number
): string {
  const paddedNumber = String(sequenceNumber).padStart(3, '0')
  return `${firstName} ${lastName} #${paddedNumber}`
}

// Overload para aceitar Order object (backward compat)
export function formatOrderIdentifierFromOrder(order: Order): string {
  return formatOrderIdentifier(order.first_name, order.last_name, order.sequence_number)
}

// Formata nome completo
export function formatFullName(order: Order): string {
  return `${order.first_name} ${order.last_name}`
}

// Extrai só o número para exibição numérica (ex: "42")
export function formatSequenceNumber(order: Order): string {
  return order.sequence_number.toString()
}

// Valida que um identifier é bem-formado
export function isValidOrderIdentifier(identifier: string): boolean {
  // Formato esperado: "First Last #NNN" com número zero-padded (3+ dígitos)
  const pattern = /^.+\s.+\s#\d{3,}$/
  return pattern.test(identifier)
}
