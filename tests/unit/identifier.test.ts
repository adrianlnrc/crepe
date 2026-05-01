import { describe, it, expect } from 'vitest'
import {
  formatOrderIdentifier,
  formatFullName,
  formatSequenceNumber,
  isValidOrderIdentifier,
} from '@/lib/domain/identifier'
import { Order } from '@/lib/domain/order'

const mockOrder: Order = {
  id: 'order-1',
  event_id: 'event-1',
  client_key: 'key-1',
  sequence_number: 42,
  status: 'pending',
  first_name: 'Maria',
  last_name: 'Silva',
  flavor_id: 'flavor-1',
  ingredient_ids: [],
  observation: null,
  cancellation_reason: null,
  created_at: '2026-04-30T10:00:00Z',
  started_at: null,
  finished_at: null,
}

describe('identifier - formatOrderIdentifier', () => {
  it('formats with first name, last name, and zero-padded sequence', () => {
    expect(formatOrderIdentifier('Maria', 'Silva', 42)).toBe('Maria Silva #042')
  })

  it('zero-pads to 3 digits', () => {
    expect(formatOrderIdentifier('João', 'Santos', 5)).toBe('João Santos #005')
  })

  it('works with sequence 1', () => {
    expect(formatOrderIdentifier('Ana', 'Costa', 1)).toBe('Ana Costa #001')
  })

  it('works with large sequences (>999)', () => {
    expect(formatOrderIdentifier('Pedro', 'Oliveira', 1234)).toBe('Pedro Oliveira #1234')
  })

  it('works with single char names', () => {
    expect(formatOrderIdentifier('A', 'B', 7)).toBe('A B #007')
  })
})

describe('identifier - formatFullName', () => {
  it('formats full name with first and last', () => {
    expect(formatFullName(mockOrder)).toBe('Maria Silva')
  })

  it('works with different names', () => {
    const order = {
      ...mockOrder,
      first_name: 'João',
      last_name: 'Santos',
    }
    expect(formatFullName(order)).toBe('João Santos')
  })
})

describe('identifier - formatSequenceNumber', () => {
  it('formats sequence number as string', () => {
    expect(formatSequenceNumber(mockOrder)).toBe('42')
  })

  it('preserves leading zeros is not applicable', () => {
    const order = { ...mockOrder, sequence_number: 7 }
    expect(formatSequenceNumber(order)).toBe('7')
  })
})

describe('identifier - isValidOrderIdentifier', () => {
  it('accepts valid identifier format', () => {
    expect(isValidOrderIdentifier('Maria Silva #042')).toBe(true)
  })

  it('accepts with large sequence', () => {
    expect(isValidOrderIdentifier('João Santos #1234')).toBe(true)
  })

  it('rejects without last name', () => {
    expect(isValidOrderIdentifier('Maria #042')).toBe(false)
  })

  it('rejects with wrong sequence padding', () => {
    expect(isValidOrderIdentifier('Maria Silva #42')).toBe(false)
  })

  it('rejects identifier without hash', () => {
    expect(isValidOrderIdentifier('Maria Silva 042')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidOrderIdentifier('')).toBe(false)
  })
})
