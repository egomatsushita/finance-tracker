'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ApiError } from '@/lib/api'
import { formatCategoryLabel } from '@/lib/format'
import { CATEGORIES_BY_KIND, transactionFormSchema, type TransactionFormValues } from '@/lib/transactionCategories'
import type { Transaction, TransactionCreatePayload } from '@/lib/types'

type TransactionFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  transaction: Transaction | null
  onClose: () => void
  onSubmit: (payload: TransactionCreatePayload) => Promise<void>
}

const KIND_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

function toFormValues(transaction: Transaction | null): TransactionFormValues {
  if (!transaction) {
    return { amount: '', kind: 'expense', category: 'other', description: '', transaction_date: '' }
  }
  return {
    amount: transaction.amount,
    kind: transaction.kind,
    category: transaction.category,
    description: transaction.description ?? '',
    transaction_date: transaction.transaction_date.slice(0, 10),
  }
}

function categoryOptionsFor(kind: TransactionFormValues['kind']) {
  return CATEGORIES_BY_KIND[kind].map((category) => ({
    value: category,
    label: formatCategoryLabel(category),
  }))
}

export function TransactionFormModal({ isOpen, mode, transaction, onClose, onSubmit }: TransactionFormModalProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [kind, setKind] = useState<TransactionFormValues['kind']>(toFormValues(transaction).kind)
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: toFormValues(transaction),
  })

  function handleKindChange(nextKind: string) {
    const parsedKind = nextKind as TransactionFormValues['kind']
    setKind(parsedKind)
    const valid: readonly string[] = CATEGORIES_BY_KIND[parsedKind]
    if (!valid.includes(getValues('category'))) {
      setValue('category', '')
    }
  }

  const submit = async (values: TransactionFormValues) => {
    setFormError(null)
    try {
      await onSubmit({
        amount: values.amount,
        kind: values.kind,
        category: values.category as TransactionCreatePayload['category'],
        description: values.description ? values.description : null,
        transaction_date: values.transaction_date,
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.body.detail)) {
        for (const issue of err.body.detail) {
          const field = issue.loc[issue.loc.length - 1]
          if (typeof field === 'string' && field in values) {
            setError(field as keyof TransactionFormValues, { message: issue.msg })
          }
        }
      } else {
        setFormError('Something went wrong')
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Add transaction' : 'Edit transaction'}>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Amount"
          type="text"
          inputMode="decimal"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <Select
              label="Kind"
              options={KIND_OPTIONS}
              value={field.value}
              onChange={(v) => {
                field.onChange(v)
                handleKindChange(v)
              }}
              onBlur={field.onBlur}
              error={errors.kind?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              label="Category"
              options={categoryOptionsFor(kind)}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.category?.message}
            />
          )}
        />
        <Input label="Description" type="text" error={errors.description?.message} {...register('description')} />
        <Input
          label="Date"
          type="date"
          error={errors.transaction_date?.message}
          {...register('transaction_date')}
        />
        {formError && (
          <p role="alert" className="text-sm text-expense">
            {formError}
          </p>
        )}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
