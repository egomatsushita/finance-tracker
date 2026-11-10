'use client'

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { IncomeExpenseTrendChart } from '@/components/charts/IncomeExpenseTrendChart'
import { Card } from '@/components/ui/Card'
import { OverviewSkeleton } from '@/components/ui/Skeleton'
import { getCategoryIcon } from '@/lib/categoryIcons'
import { formatCategoryLabel, formatMoney } from '@/lib/format'
import { useRecentTransactions, useTransactionSummary } from '@/lib/queries'

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: 'highlight' | 'income' | 'expense'
}) {
  const toneClasses = {
    highlight: 'bg-highlight/10 text-highlight',
    income: 'bg-income/10 text-income',
    expense: 'bg-expense/10 text-expense',
  }[tone]
  const valueClasses = {
    highlight: 'text-highlight',
    income: 'text-income',
    expense: 'text-expense',
  }[tone]

  return (
    <Card className="flex min-w-0 items-center gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-text">{label}</p>
        <p className={`truncate font-mono text-2xl font-semibold ${valueClasses}`}>{value}</p>
      </div>
    </Card>
  )
}

export function OverviewClient() {
  const summary = useTransactionSummary()
  const recent = useRecentTransactions(5)

  if (summary.isLoading || recent.isLoading) {
    return <OverviewSkeleton />
  }

  if (summary.isError || recent.isError || !summary.data || !recent.data) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-text">
        Couldn&apos;t load your data. Try refreshing the page.
      </main>
    )
  }

  const hasTransactions = recent.data.length > 0 || summary.data.by_month.length > 0

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard icon={Wallet} label="Net" value={formatMoney(summary.data.net)} tone="highlight" />
        <KpiCard
          icon={TrendingUp}
          label="Income"
          value={formatMoney(summary.data.total_income)}
          tone="income"
        />
        <KpiCard
          icon={TrendingDown}
          label="Expense"
          value={formatMoney(summary.data.total_expense)}
          tone="expense"
        />
      </div>

      {!hasTransactions ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted-text">
            No transactions yet — add one to see your overview come to life.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="mb-4 text-sm font-medium text-muted-text">Income vs. expense</h2>
            <IncomeExpenseTrendChart data={summary.data.by_month} />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-muted-text">Expenses by category</h2>
                <p className="font-mono text-sm font-semibold text-ink">
                  {formatMoney(summary.data.total_expense)}
                </p>
              </div>
              <CategoryBarChart data={summary.data.by_category} />
            </Card>

            <Card>
              <h2 className="mb-2 text-sm font-medium text-muted-text">Recent transactions</h2>
              {recent.data.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-text">No transactions yet</p>
              ) : (
                <ul className="divide-y divide-muted-border">
                  {recent.data.map((t) => {
                    const Icon = getCategoryIcon(t.category)
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-border/60 text-ink">
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <span className="truncate text-sm text-ink">
                            {formatCategoryLabel(t.category)}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-sm ${t.kind === 'income' ? 'text-income' : 'text-expense'}`}
                        >
                          {t.kind === 'income' ? '+' : '−'}
                          {formatMoney(t.amount)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </main>
  )
}
