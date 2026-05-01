import { describe, it, expect } from 'vitest'
import {
  isValidTransition,
  getValidTransitionsFrom,
  isInQueue,
  isFinalized,
  describeTransition,
  OrderStatus,
} from '@/lib/domain/order'

describe('order - isValidTransition', () => {
  it('allows pending -> in_progress', () => {
    expect(isValidTransition('pending', 'in_progress')).toBe(true)
  })

  it('allows pending -> cancelled', () => {
    expect(isValidTransition('pending', 'cancelled')).toBe(true)
  })

  it('disallows pending -> done', () => {
    expect(isValidTransition('pending', 'done')).toBe(false)
  })

  it('allows in_progress -> done', () => {
    expect(isValidTransition('in_progress', 'done')).toBe(true)
  })

  it('allows in_progress -> cancelled', () => {
    expect(isValidTransition('in_progress', 'cancelled')).toBe(true)
  })

  it('disallows in_progress -> pending', () => {
    expect(isValidTransition('in_progress', 'pending')).toBe(false)
  })

  it('disallows done -> any transition', () => {
    const statuses: OrderStatus[] = ['pending', 'in_progress', 'done', 'cancelled']
    statuses.forEach((status) => {
      expect(isValidTransition('done', status)).toBe(false)
    })
  })

  it('disallows cancelled -> any transition', () => {
    const statuses: OrderStatus[] = ['pending', 'in_progress', 'done', 'cancelled']
    statuses.forEach((status) => {
      expect(isValidTransition('cancelled', status)).toBe(false)
    })
  })
})

describe('order - getValidTransitionsFrom', () => {
  it('returns correct transitions from pending', () => {
    const transitions = getValidTransitionsFrom('pending')
    expect(transitions).toEqual(['in_progress', 'cancelled'])
  })

  it('returns correct transitions from in_progress', () => {
    const transitions = getValidTransitionsFrom('in_progress')
    expect(transitions).toEqual(['done', 'cancelled'])
  })

  it('returns empty array for done', () => {
    const transitions = getValidTransitionsFrom('done')
    expect(transitions).toEqual([])
  })

  it('returns empty array for cancelled', () => {
    const transitions = getValidTransitionsFrom('cancelled')
    expect(transitions).toEqual([])
  })
})

describe('order - isInQueue', () => {
  it('returns true for pending', () => {
    expect(isInQueue({ status: 'pending' } as any)).toBe(true)
  })

  it('returns true for in_progress', () => {
    expect(isInQueue({ status: 'in_progress' } as any)).toBe(true)
  })

  it('returns false for done', () => {
    expect(isInQueue({ status: 'done' } as any)).toBe(false)
  })

  it('returns false for cancelled', () => {
    expect(isInQueue({ status: 'cancelled' } as any)).toBe(false)
  })
})

describe('order - isFinalized', () => {
  it('returns false for pending', () => {
    expect(isFinalized({ status: 'pending' } as any)).toBe(false)
  })

  it('returns false for in_progress', () => {
    expect(isFinalized({ status: 'in_progress' } as any)).toBe(false)
  })

  it('returns true for done', () => {
    expect(isFinalized({ status: 'done' } as any)).toBe(true)
  })

  it('returns true for cancelled', () => {
    expect(isFinalized({ status: 'cancelled' } as any)).toBe(true)
  })
})

describe('order - describeTransition', () => {
  it('describes pending -> in_progress', () => {
    expect(describeTransition('pending', 'in_progress')).toBe('Started preparation')
  })

  it('describes pending -> cancelled', () => {
    expect(describeTransition('pending', 'cancelled')).toBe('Cancelled before start')
  })

  it('describes in_progress -> done', () => {
    expect(describeTransition('in_progress', 'done')).toBe('Ready for pickup')
  })

  it('describes in_progress -> cancelled', () => {
    expect(describeTransition('in_progress', 'cancelled')).toBe('Cancelled during preparation')
  })

  it('returns generic message for unknown transition', () => {
    expect(describeTransition('done', 'done' as any)).toBe('Status changed')
  })
})
