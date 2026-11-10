export type User = {
  id: string
  username: string
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TransactionKind = 'income' | 'expense'

export type IncomeCategory = 'salary' | 'investment' | 'rental' | 'gift' | 'other'

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'savings'
  | 'other'

export type TransactionCategory = IncomeCategory | ExpenseCategory

export type Transaction = {
  id: number
  user_id: string
  amount: string
  kind: TransactionKind
  category: TransactionCategory
  description: string | null
  transaction_date: string
  created_at: string
  updated_at: string
}

export type TransactionSummary = {
  total_income: string
  total_expense: string
  net: string
  by_category: { kind: TransactionKind; category: TransactionCategory; total: string }[]
  by_month: { month: string; income: string; expense: string }[]
}

export type ValidationErrorDetail = {
  loc: unknown[]
  msg: string
  type: string
}

export type ApiErrorBody = {
  detail: string | ValidationErrorDetail[]
}

export type LoginResponse = {
  detail: string
}
