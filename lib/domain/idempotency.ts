import { v7 as uuidv7 } from 'uuid'
import { CreateOrderInput } from '../validation/order-schema'

// Gera um novo client_key (UUIDv7) para um pedido
// UUIDv7 é time-based com componente aleatório, perfeito para este caso
export function generateClientKey(): string {
  return uuidv7()
}

// Valida que um string é um UUIDv7 válido
export function isValidClientKey(key: string): boolean {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(key)
}

// Normaliza payload de pedido para comparação de idempotência
// Remove campos que são gerados no servidor (id, sequence_number, timestamps)
// Mantém apenas os campos que o cliente enviou
export function normalizeOrderPayload(input: CreateOrderInput): string {
  // Cria um objeto com campos em ordem determinística
  const normalized = {
    event_id: input.event_id,
    flavor_id: input.flavor_id,
    first_name: input.first_name,
    last_name: input.last_name,
    ingredient_ids: input.ingredient_ids ? [...input.ingredient_ids].sort() : [],
    observation: input.observation || null,
  }

  // JSON.stringify com sorted keys para hash consistente
  return JSON.stringify(normalized)
}

// Compara dois payloads para idempotência
export function isSamePayload(payload1: CreateOrderInput, payload2: CreateOrderInput): boolean {
  return normalizeOrderPayload(payload1) === normalizeOrderPayload(payload2)
}
