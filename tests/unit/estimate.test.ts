import { describe, it, expect } from 'vitest'
import {
  estimateWaitSeconds,
  estimateWaitSecondsSimple,
  formatWaitTime,
} from '@/lib/domain/estimate'
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
    flavor_id: 'flavor-2',
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
    status: 'done',
    first_name: 'Carol',
    last_name: 'C',
    flavor_id: 'flavor-1',
    ingredient_ids: [],
    observation: null,
    cancellation_reason: null,
    created_at: '2026-04-30T10:10:00Z',
    started_at: '2026-04-30T10:11:00Z',
    finished_at: '2026-04-30T10:15:00Z',
  },
]

const flavors = new Map([
  ['flavor-1', { id: 'flavor-1', tempo_medio_preparo: 180 }],
  ['flavor-2', { id: 'flavor-2', tempo_medio_preparo: 240 }],
])

describe('estimate - estimateWaitSeconds', () => {
  it('returns 0 for finished order', () => {
    const seconds = estimateWaitSeconds(mockOrders[2], mockOrders, flavors)
    expect(seconds).toBe(0)
  })

  it('returns only prep time for first order', () => {
    const seconds = estimateWaitSeconds(mockOrders[0], mockOrders, flavors)
    expect(seconds).toBe(180) // flavor-1 tempo
  })

  it('returns sum of prep times for second order', () => {
    const seconds = estimateWaitSeconds(mockOrders[1], mockOrders, flavors)
    expect(seconds).toBe(180 + 240) // order-1 + order-2 tempo
  })

  it('uses default prep time if flavor not found', () => {
    const orderWithUnknownFlavor = {
      ...mockOrders[0],
      flavor_id: 'unknown-flavor',
    }
    const seconds = estimateWaitSeconds(orderWithUnknownFlavor, mockOrders, flavors)
    expect(seconds).toBe(300) // default
  })
})

describe('estimate - estimateWaitSecondsSimple', () => {
  it('returns 0 for finished order', () => {
    const seconds = estimateWaitSecondsSimple(mockOrders[2], mockOrders)
    expect(seconds).toBe(0)
  })

  it('returns prep time for first order (1 * globalAvg)', () => {
    const seconds = estimateWaitSecondsSimple(mockOrders[0], mockOrders, 300)
    expect(seconds).toBe(300)
  })

  it('returns 2x prep time for second order', () => {
    const seconds = estimateWaitSecondsSimple(mockOrders[1], mockOrders, 300)
    expect(seconds).toBe(600)
  })

  it('uses custom global avg time', () => {
    const seconds = estimateWaitSecondsSimple(mockOrders[0], mockOrders, 500)
    expect(seconds).toBe(500)
  })
})

describe('estimate - formatWaitTime', () => {
  it('formats seconds', () => {
    expect(formatWaitTime(45)).toBe('45s')
  })

  it('formats minutes', () => {
    expect(formatWaitTime(300)).toBe('5 min')
  })

  it('formats minutes (rounded)', () => {
    expect(formatWaitTime(330)).toBe('6 min')
  })

  it('formats hours only', () => {
    expect(formatWaitTime(3600)).toBe('1h')
  })

  it('formats hours and minutes', () => {
    expect(formatWaitTime(3900)).toBe('1h 5 min') // 1h 5min
  })

  it('handles large times', () => {
    expect(formatWaitTime(7200)).toBe('2h')
  })
})
