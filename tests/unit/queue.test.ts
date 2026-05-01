import { describe, it, expect } from 'vitest'
import {
  calculateQueuePosition,
  countAheadInQueue,
  isNextInQueue,
  getUpcomingQueue,
} from '@/lib/domain/queue'
import { Order } from '@/lib/domain/order'

const mockOrders: Order[] = [
  {
    id: 'order-1',
    event_id: 'event-1',
    client_key: 'key-1',
    sequence_number: 1,
    status: 'pending',
    first_name: 'Alice',
    last_name: 'A',
    flavor_id: 'flavor-1',
    ingredient_ids: [],
    observation: null,
    cancellation_reason: null,
    created_at: '2026-04-30T10:00:00Z',
    started_at: null,
    finished_at: null,
  },
  {
    id: 'order-2',
    event_id: 'event-1',
    client_key: 'key-2',
    sequence_number: 2,
    status: 'pending',
    first_name: 'Bob',
    last_name: 'B',
    flavor_id: 'flavor-1',
    ingredient_ids: [],
    observation: null,
    cancellation_reason: null,
    created_at: '2026-04-30T10:05:00Z',
    started_at: null,
    finished_at: null,
  },
  {
    id: 'order-3',
    event_id: 'event-1',
    client_key: 'key-3',
    sequence_number: 3,
    status: 'in_progress',
    first_name: 'Carol',
    last_name: 'C',
    flavor_id: 'flavor-1',
    ingredient_ids: [],
    observation: null,
    cancellation_reason: null,
    created_at: '2026-04-30T10:10:00Z',
    started_at: '2026-04-30T10:15:00Z',
    finished_at: null,
  },
  {
    id: 'order-4',
    event_id: 'event-1',
    client_key: 'key-4',
    sequence_number: 4,
    status: 'done',
    first_name: 'Dave',
    last_name: 'D',
    flavor_id: 'flavor-1',
    ingredient_ids: [],
    observation: null,
    cancellation_reason: null,
    created_at: '2026-04-30T10:20:00Z',
    started_at: '2026-04-30T10:21:00Z',
    finished_at: '2026-04-30T10:25:00Z',
  },
]

describe('queue - calculateQueuePosition', () => {
  it('returns 0 for first order in queue', () => {
    const position = calculateQueuePosition(mockOrders[0], mockOrders)
    expect(position).toBe(0)
  })

  it('returns correct position for order in middle of queue', () => {
    const position = calculateQueuePosition(mockOrders[1], mockOrders)
    expect(position).toBe(1)
  })

  it('returns correct position for in_progress order', () => {
    const position = calculateQueuePosition(mockOrders[2], mockOrders)
    expect(position).toBe(2)
  })

  it('returns null for finished order', () => {
    const position = calculateQueuePosition(mockOrders[3], mockOrders)
    expect(position).toBeNull()
  })

  it('returns null for cancelled order', () => {
    const cancelledOrder = { ...mockOrders[0], status: 'cancelled' as const }
    const position = calculateQueuePosition(cancelledOrder, mockOrders)
    expect(position).toBeNull()
  })
})

describe('queue - countAheadInQueue', () => {
  it('returns 0 for first order', () => {
    const count = countAheadInQueue(mockOrders[0], mockOrders)
    expect(count).toBe(0)
  })

  it('returns correct count for middle order', () => {
    const count = countAheadInQueue(mockOrders[1], mockOrders)
    expect(count).toBe(1)
  })

  it('returns 0 for finished order', () => {
    const count = countAheadInQueue(mockOrders[3], mockOrders)
    expect(count).toBe(0)
  })
})

describe('queue - isNextInQueue', () => {
  it('returns true for first order', () => {
    expect(isNextInQueue(mockOrders[0], mockOrders)).toBe(true)
  })

  it('returns false for second order', () => {
    expect(isNextInQueue(mockOrders[1], mockOrders)).toBe(false)
  })

  it('returns false for finished order', () => {
    expect(isNextInQueue(mockOrders[3], mockOrders)).toBe(false)
  })
})

describe('queue - getUpcomingQueue', () => {
  it('returns all queued orders in correct order', () => {
    const upcoming = getUpcomingQueue(mockOrders)
    expect(upcoming).toHaveLength(3) // order-1, order-2, order-3
    expect(upcoming[0].id).toBe('order-1')
    expect(upcoming[1].id).toBe('order-2')
    expect(upcoming[2].id).toBe('order-3')
  })

  it('respects limit parameter', () => {
    const upcoming = getUpcomingQueue(mockOrders, 2)
    expect(upcoming).toHaveLength(2)
  })
})
