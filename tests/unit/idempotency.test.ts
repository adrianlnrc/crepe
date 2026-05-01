import { describe, it, expect } from 'vitest'
import {
  generateClientKey,
  isValidClientKey,
  normalizeOrderPayload,
  isSamePayload,
} from '@/lib/domain/idempotency'
import { CreateOrderInput } from '@/lib/validation/order-schema'

describe('idempotency - generateClientKey', () => {
  it('generates valid UUIDv7', () => {
    const key = generateClientKey()
    expect(isValidClientKey(key)).toBe(true)
  })

  it('generates unique keys on multiple calls', () => {
    const key1 = generateClientKey()
    const key2 = generateClientKey()
    expect(key1).not.toBe(key2)
  })

  it('generates keys with correct version (7)', () => {
    const key = generateClientKey()
    const parts = key.split('-')
    // Version is in position 2 of the 5 parts, first char
    expect(parts[2][0]).toBe('7')
  })
})

describe('idempotency - isValidClientKey', () => {
  it('accepts valid UUIDv7', () => {
    const key = generateClientKey()
    expect(isValidClientKey(key)).toBe(true)
  })

  it('rejects invalid UUID format', () => {
    expect(isValidClientKey('not-a-uuid')).toBe(false)
  })

  it('rejects UUID with wrong version', () => {
    // UUIDv4 example
    expect(isValidClientKey('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidClientKey('')).toBe(false)
  })

  it('is case-insensitive', () => {
    const key = generateClientKey()
    const upperKey = key.toUpperCase()
    expect(isValidClientKey(upperKey)).toBe(true)
  })
})

describe('idempotency - normalizeOrderPayload', () => {
  const basePayload: CreateOrderInput = {
    event_id: 'event-1',
    client_key: generateClientKey(),
    flavor_id: 'flavor-1',
    first_name: 'Maria',
    last_name: 'Silva',
    ingredient_ids: ['ing-1', 'ing-2'],
    observation: 'Sem leite',
  }

  it('produces consistent hash for same payload', () => {
    const hash1 = normalizeOrderPayload(basePayload)
    const hash2 = normalizeOrderPayload(basePayload)
    expect(hash1).toBe(hash2)
  })

  it('produces different hash for different event_id', () => {
    const hash1 = normalizeOrderPayload(basePayload)
    const hash2 = normalizeOrderPayload({
      ...basePayload,
      event_id: 'event-2',
    })
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hash for different first_name', () => {
    const hash1 = normalizeOrderPayload(basePayload)
    const hash2 = normalizeOrderPayload({
      ...basePayload,
      first_name: 'João',
    })
    expect(hash1).not.toBe(hash2)
  })

  it('ignores order of ingredient_ids', () => {
    const payload1: CreateOrderInput = {
      ...basePayload,
      ingredient_ids: ['ing-1', 'ing-2', 'ing-3'],
    }
    const payload2: CreateOrderInput = {
      ...basePayload,
      ingredient_ids: ['ing-3', 'ing-1', 'ing-2'],
    }
    const hash1 = normalizeOrderPayload(payload1)
    const hash2 = normalizeOrderPayload(payload2)
    expect(hash1).toBe(hash2)
  })

  it('handles null observation', () => {
    const hash1 = normalizeOrderPayload({
      ...basePayload,
      observation: null,
    })
    const hash2 = normalizeOrderPayload({
      ...basePayload,
      observation: null as any,
    })
    expect(hash1).toBe(hash2)
  })

  it('handles empty ingredient_ids', () => {
    const hash1 = normalizeOrderPayload({
      ...basePayload,
      ingredient_ids: [],
    })
    const hash2 = normalizeOrderPayload({
      ...basePayload,
      ingredient_ids: [] as any,
    })
    expect(hash1).toBe(hash2)
  })
})

describe('idempotency - isSamePayload', () => {
  const basePayload: CreateOrderInput = {
    event_id: 'event-1',
    client_key: generateClientKey(),
    flavor_id: 'flavor-1',
    first_name: 'Maria',
    last_name: 'Silva',
    ingredient_ids: ['ing-1', 'ing-2'],
    observation: 'Sem leite',
  }

  it('returns true for identical payloads', () => {
    expect(isSamePayload(basePayload, basePayload)).toBe(true)
  })

  it('returns true for payloads with ingredients in different order', () => {
    const payload2: CreateOrderInput = {
      ...basePayload,
      ingredient_ids: ['ing-2', 'ing-1'],
    }
    expect(isSamePayload(basePayload, payload2)).toBe(true)
  })

  it('returns false for different first_name', () => {
    const payload2: CreateOrderInput = {
      ...basePayload,
      first_name: 'João',
    }
    expect(isSamePayload(basePayload, payload2)).toBe(false)
  })

  it('returns false for different flavor_id', () => {
    const payload2: CreateOrderInput = {
      ...basePayload,
      flavor_id: 'flavor-2',
    }
    expect(isSamePayload(basePayload, payload2)).toBe(false)
  })
})
