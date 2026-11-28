import { describe, expect, it } from 'vitest'
import { formatCategoryLabel, formatDate, formatMoney } from './format'

describe('formatMoney', () => {
  it('formats a typical decimal string with a currency symbol and thousands separators', () => {
    expect(formatMoney('1234.5')).toBe('$1,234.50')
  })

  it('formats zero', () => {
    expect(formatMoney('0')).toBe('$0.00')
    expect(formatMoney('0.00')).toBe('$0.00')
  })

  it('does not introduce floating-point drift for a clean two-decimal value', () => {
    expect(formatMoney('10.10')).toBe('$10.10')
  })

  it('places the sign before the currency symbol for negatives', () => {
    expect(formatMoney('-500')).toBe('-$500.00')
  })
})

describe('formatCategoryLabel', () => {
  it('capitalizes the first letter', () => {
    expect(formatCategoryLabel('groceries')).toBe('Groceries')
    expect(formatCategoryLabel('other')).toBe('Other')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string as a short readable date', () => {
    expect(formatDate('2026-03-05T00:00:00Z')).toBe('Mar 5, 2026')
  })
})
