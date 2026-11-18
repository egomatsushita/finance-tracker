import { z } from 'zod'
import type { ExpenseCategory, IncomeCategory, TransactionCategory, TransactionKind } from './types'

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  'salary',
  'investment',
  'rental',
  'gift',
  'other',
]

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'housing',
  'utilities',
  'groceries',
  'transport',
  'health',
  'entertainment',
  'savings',
  'other',
]

export const CATEGORIES_BY_KIND: Record<TransactionKind, readonly TransactionCategory[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
}

export const ALL_CATEGORIES: readonly TransactionCategory[] = Array.from(
  new Set<TransactionCategory>([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
)

export const transactionFormSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
    kind: z.enum(['income', 'expense']),
    category: z.enum([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as [string, ...string[]]),
    description: z.string().max(255, 'Description must be 255 characters or fewer').optional(),
    transaction_date: z.string().min(1, 'Date is required'),
  })
  .superRefine((data, ctx) => {
    const valid: readonly string[] = CATEGORIES_BY_KIND[data.kind]
    if (!valid.includes(data.category)) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: `'${data.category}' is not a valid category for '${data.kind}'`,
      })
    }
  })

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
