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
  it('formats order with first name and sequence', () => {
    expect(formatOrderIdentifier(mockOrder)).toBe('Maria #42')
  })

  it('works with single char names', () => {
    const order = { ...mockOrder, first_name: 'A' }
    expect(formatOrderIdentifier(order)).toBe('A #42')
  })

  it('works with long names', () => {
    const order = {
      ...mockOrder,
      first_name: 'Alexandrino',
    }
    expect(formatOrderIdentifier(order)).toBe('Alexandrino #42')
  })

  it('works with sequence 1', () => {
    const order = { ...mockOrder, sequence_number: 1 }
    expect(formatOrderIdentifier(order)).toBe('Maria #1')
  })

  it('works with large sequences', () => {
    const order = { ...mockOrder, sequence_number: 9999 }
    expect(formatOrderIdentifier(order)).toBe('Maria #9999')
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
    expect(isValidOrderIdentifier('Maria #42')).toBe(true)
  })

  it('accepts identifier with single char name', () => {
    expect(isValidOrderIdentifier('A #1')).toBe(true)
  })

  it('accepts identifier with long name', () => {
    expect(isValidOrderIdentifier('Alexandra Maria Silva #999')).toBe(true)
  })

  it('rejects identifier without hash', () => {
    expect(isValidOrderIdentifier('Maria 42')).toBe(false)
  })

  it('rejects identifier without number', () => {
    expect(isValidOrderIdentifier('Maria #')).toBe(false)
  })

  it('rejects identifier with space before hash', () => {
    expect(isValidOrderIdentifier('Maria#42')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidOrderIdentifier('')).toBe(false)
  })
})
