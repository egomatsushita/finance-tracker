'use client'

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { IncomeExpenseTrendChart } from '@/components/charts/IncomeExpenseTrendChart'
import { Card } from '@/components/ui/Card'
import { OverviewSkeleton } from '@/components/ui/Skeleton'
import { getCategoryIcon } from '@/lib/categoryIcons'
import { formatCategoryLabel, formatDate, formatMonthLabel, formatMoney } from '@/lib/format'
import { useRecentTransactions, useTransactionSummary } from '@/lib/queries'
import { fillMonthGaps } from '@/lib/trend'

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
  delta,
  deltaLabel,
  first,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: 'highlight' | 'income' | 'expense'
  delta: number | null
  deltaLabel: string | null
  first?: boolean
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
    <div
      className={`flex min-w-0 flex-1 items-center gap-4 p-5 ${first ? '' : 'border-t border-muted-border md:border-l md:border-t-0'}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-text">{label}</p>
        <p className={`truncate font-mono text-2xl font-semibold ${valueClasses}`}>{value}</p>
        {delta !== null && deltaLabel && (
          <p className="text-xs text-muted-text">
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}% {deltaLabel}
          </p>
        )}
      </div>
    </div>
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

  // The KPI tiles describe the most recent month with activity, compared to the
  // previous month that had activity. by_month has no gap-fill, so that previous
  // month may be several calendar months back — the delta names it explicitly
  // rather than claiming "last month".
  const months = summary.data.by_month
  const current = months.at(-1)
  const previous = months.at(-2)

  const incomeCurr = current ? Number(current.income) : 0
  const expenseCurr = current ? Number(current.expense) : 0
  const netCurr = incomeCurr - expenseCurr

  const deltaLabel = previous ? `vs ${formatMonthLabel(previous.month)}` : null
  const incomeDelta = previous ? pctDelta(incomeCurr, Number(previous.income)) : null
  const expenseDelta = previous ? pctDelta(expenseCurr, Number(previous.expense)) : null
  const netDelta = previous
    ? pctDelta(netCurr, Number(previous.income) - Number(previous.expense))
    : null

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        {current && (
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-text uppercase">
            {formatMonthLabel(current.month)}
          </p>
        )}
        <div className="flex flex-col divide-muted-border rounded-2xl border border-muted-border bg-surface md:flex-row">
          <KpiTile
            icon={Wallet}
            label="Net"
            value={formatMoney(String(netCurr))}
            tone="highlight"
            delta={netDelta}
            deltaLabel={deltaLabel}
            first
          />
          <KpiTile
            icon={TrendingUp}
            label="Income"
            value={formatMoney(current ? current.income : '0.00')}
            tone="income"
            delta={incomeDelta}
            deltaLabel={deltaLabel}
          />
          <KpiTile
            icon={TrendingDown}
            label="Expense"
            value={formatMoney(current ? current.expense : '0.00')}
            tone="expense"
            delta={expenseDelta}
            deltaLabel={deltaLabel}
          />
        </div>
      </div>

      {!hasTransactions ? (
        <Card elevated={false}>
          <p className="py-8 text-center text-sm text-muted-text">
            No transactions yet — add one to see your overview come to life.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="mb-4 text-sm font-medium text-muted-text">Income vs. expense</h2>
            <IncomeExpenseTrendChart data={fillMonthGaps(summary.data.by_month)} />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card elevated={false}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-muted-text">
                  Expenses by category
                  <span className="ml-2 text-xs font-normal text-muted-text">All time</span>
                </h2>
                <p className="font-mono text-sm font-semibold text-ink">
                  {formatMoney(summary.data.total_expense)}
                </p>
              </div>
              <CategoryBarChart data={summary.data.by_category} />
            </Card>

            <Card elevated={false}>
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
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm text-ink">
                              {formatCategoryLabel(t.category)}
                            </span>
                            <span className="text-xs text-muted-text">
                              {formatDate(t.transaction_date)}
                            </span>
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
