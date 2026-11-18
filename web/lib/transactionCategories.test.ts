import { describe, expect, it } from 'vitest'
import { CATEGORIES_BY_KIND, transactionFormSchema } from './transactionCategories'

describe('CATEGORIES_BY_KIND', () => {
  it('maps income and expense kinds to their category lists', () => {
    expect(CATEGORIES_BY_KIND.income).toContain('salary')
    expect(CATEGORIES_BY_KIND.expense).toContain('groceries')
    expect(CATEGORIES_BY_KIND.income).not.toContain('groceries')
  })
})

describe('transactionFormSchema', () => {
  const base = {
    amount: '50.00',
    description: '',
    transaction_date: '2026-03-05',
  }

  it('accepts a valid income/category pairing', () => {
    const result = transactionFormSchema.safeParse({ ...base, kind: 'income', category: 'salary' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid expense/category pairing', () => {
    const result = transactionFormSchema.safeParse({ ...base, kind: 'expense', category: 'groceries' })
    expect(result.success).toBe(true)
  })

  it('rejects a category that does not belong to the chosen kind', () => {
    const result = transactionFormSchema.safeParse({ ...base, kind: 'income', category: 'groceries' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['category'])
    }
  })

  it('rejects an amount of zero or less', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      kind: 'expense',
      category: 'groceries',
      amount: '0',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a description longer than 255 characters', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      kind: 'expense',
      category: 'groceries',
      description: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('requires a transaction date', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      kind: 'expense',
      category: 'groceries',
      transaction_date: '',
    })
    expect(result.success).toBe(false)
  })
})
