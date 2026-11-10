import { describe, expect, it } from 'vitest'
import { formatCategoryLabel, formatMoney } from './format'

describe('formatMoney', () => {
  it('formats a typical decimal string with thousands separators', () => {
    expect(formatMoney('1234.5')).toBe('1,234.50')
  })

  it('formats zero', () => {
    expect(formatMoney('0')).toBe('0.00')
    expect(formatMoney('0.00')).toBe('0.00')
  })

  it('does not introduce floating-point drift for a clean two-decimal value', () => {
    expect(formatMoney('10.10')).toBe('10.10')
  })
})

describe('formatCategoryLabel', () => {
  it('capitalizes the first letter', () => {
    expect(formatCategoryLabel('groceries')).toBe('Groceries')
    expect(formatCategoryLabel('other')).toBe('Other')
  })
})
