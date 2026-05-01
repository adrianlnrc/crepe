import { z } from 'zod'

// UUIDv7 validation (mais específico que uuid() genérico)
const UUIDv7Schema = z.string().uuid().refine(
  (val) => {
    // UUIDv7 começa com '7' na versão (3º bloco)
    const parts = val.split('-')
    const versionHex = parseInt(parts[2][0], 16)
    return versionHex === 7
  },
  { message: 'Must be a valid UUIDv7' }
)

// Criar novo pedido (convidado)
export const createOrderSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  client_key: UUIDv7Schema,
  flavor_id: z.string().uuid('Invalid flavor ID'),
  first_name: z
    .string()
    .min(1, 'Required')
    .max(60, 'Maximum 60 characters'),
  last_name: z
    .string()
    .min(1, 'Required')
    .max(60, 'Maximum 60 characters'),
  ingredient_ids: z.array(z.string().uuid()).optional().default([]),
  observation: z
    .string()
    .max(140, 'Maximum 140 characters')
    .optional()
    .nullable()
    .default(null),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// Transição de estado de pedido (cozinha)
export const orderTransitionSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  new_status: z.enum(['pending', 'in_progress', 'done', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid status' }),
  }),
  reason: z
    .string()
    .max(200, 'Maximum 200 characters')
    .optional()
    .nullable()
    .default(null),
})

export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>

// Kitchen login
export const kitchenLoginSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  kitchen_code: z
    .string()
    .min(4, 'Code must be at least 4 characters')
    .max(32, 'Code must be at most 32 characters'),
})

export type KitchenLoginInput = z.infer<typeof kitchenLoginSchema>

// Query para obter pedido pelo client_key (convidado)
export const getOrderByClientKeySchema = z.object({
  client_key: UUIDv7Schema,
})

export type GetOrderByClientKeyInput = z.infer<typeof getOrderByClientKeySchema>

// Query para histórico (event_id necessário)
export const getHistorySchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  limit: z.number().int().positive().default(50),
})

export type GetHistoryInput = z.infer<typeof getHistorySchema>
