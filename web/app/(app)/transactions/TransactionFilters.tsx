import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCategoryLabel } from '@/lib/format'
import { ALL_CATEGORIES, CATEGORIES_BY_KIND } from '@/lib/transactionCategories'
import type { TransactionCategory, TransactionKind } from '@/lib/types'

export type TransactionFiltersValue = {
  kind: TransactionKind | 'all'
  category: TransactionCategory | ''
  dateFrom: string
  dateTo: string
}

type TransactionFiltersProps = {
  value: TransactionFiltersValue
  onChange: (value: TransactionFiltersValue) => void
  onAddClick: () => void
}

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

export function TransactionFilters({ value, onChange, onAddClick }: TransactionFiltersProps) {
  // Dates are tracked locally so the inputs can always reflect what the user
  // typed, even while the range is momentarily invalid and withheld from onChange.
  const [draftDates, setDraftDates] = useState({ dateFrom: value.dateFrom, dateTo: value.dateTo })
  const [dateError, setDateError] = useState<string | null>(null)

  const categoryOptions = (value.kind === 'all' ? ALL_CATEGORIES : CATEGORIES_BY_KIND[value.kind]).map(
    (category) => ({
      value: category,
      label: formatCategoryLabel(category),
    }),
  )

  function handleKindChange(kind: TransactionFiltersValue['kind']) {
    onChange({ ...value, kind, category: '' })
  }

  function handleDateChange(field: 'dateFrom' | 'dateTo', nextValue: string) {
    const nextDraft = { ...draftDates, [field]: nextValue }
    setDraftDates(nextDraft)
    if (nextDraft.dateFrom && nextDraft.dateTo && nextDraft.dateFrom > nextDraft.dateTo) {
      setDateError('"From" date must be before "To" date')
      return
    }
    setDateError(null)
    onChange({ ...value, ...nextDraft })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-muted-border bg-surface p-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <Select
          label="Kind"
          options={KIND_OPTIONS}
          value={value.kind}
          onChange={(v) => handleKindChange(v as TransactionFiltersValue['kind'])}
        />
        <Select
          label="Category"
          options={[{ value: '', label: 'All' }, ...categoryOptions]}
          value={value.category}
          onChange={(v) => onChange({ ...value, category: v as TransactionCategory | '' })}
        />
        <Input
          label="From"
          type="date"
          value={draftDates.dateFrom}
          onChange={(e) => handleDateChange('dateFrom', e.target.value)}
        />
        <Input
          label="To"
          type="date"
          value={draftDates.dateTo}
          onChange={(e) => handleDateChange('dateTo', e.target.value)}
        />
      </div>
      {dateError && (
        <p role="alert" className="text-sm text-expense">
          {dateError}
        </p>
      )}
      <Button onClick={onAddClick}>Add transaction</Button>
    </div>
  )
}
