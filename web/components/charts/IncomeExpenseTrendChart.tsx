import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Props as RechartsLabelProps } from 'recharts/types/component/Label'
import type { TooltipContentProps } from 'recharts/types/component/Tooltip'
import { formatMoney } from '@/lib/format'
import type { TransactionSummary } from '@/lib/types'

// Bar-top value labels can land right on a Y-axis gridline depending on the
// data (e.g. a bar whose value sits close to a tick). Rather than hide
// gridlines or guess label offsets, give the label a surface-colored stroke
// "halo" behind its fill — it knocks out whatever gridline crosses it, the
// same way the dataviz skill's surface-gap spacer separates touching marks.
function ValueLabel({ x, y, value }: RechartsLabelProps) {
  if (x === undefined || y === undefined || value === undefined || value === null) return null
  const text = formatMoney(String(value))
  return (
    <text
      x={x}
      y={Number(y) - 6}
      textAnchor="middle"
      fontSize={12}
      paintOrder="stroke"
      stroke="var(--surface)"
      strokeWidth={4}
      strokeLinejoin="round"
      fill="var(--ink)"
    >
      {text}
    </text>
  )
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-xl bg-[#111827] px-3 py-2 text-sm text-white shadow-xl">
      <p className="mb-1 font-medium">{String(label)}</p>
      {payload.map((entry) => {
        const value = Array.isArray(entry.value) ? entry.value[0] : entry.value
        return (
          <p key={entry.name} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.name === 'income' ? 'Income' : 'Expense'}: {formatMoney(String(value ?? 0))}
          </p>
        )
      })}
    </div>
  )
}

export function IncomeExpenseTrendChart({ data }: { data: TransactionSummary['by_month'] }) {
  const gradientId = useId()

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-text">
        No transactions yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    month: d.month,
    income: Number(d.income),
    expense: Number(d.expense),
    incomeRaw: d.income,
    expenseRaw: d.expense,
  }))

  const incomeGradient = `${gradientId}-income`
  const expenseGradient = `${gradientId}-expense`
  const shadowFilter = `${gradientId}-bar-shadow`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barGap={2} margin={{ top: 28, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={incomeGradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--income)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--income)" stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id={expenseGradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--expense)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--expense)" stopOpacity={0.75} />
          </linearGradient>
          <filter id={shadowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity={0.25} />
          </filter>
        </defs>
        <CartesianGrid stroke="var(--muted-border)" strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="month"
          stroke="var(--muted-text)"
          tick={{ fill: 'var(--muted-text)' }}
          interval={0}
        />
        <YAxis stroke="var(--muted-text)" tick={{ fill: 'var(--muted-text)' }} />
        <Tooltip content={ChartTooltip} cursor={{ fill: 'var(--muted-border)', opacity: 0.3 }} />
        <Legend formatter={(value) => (value === 'income' ? 'Income' : 'Expense')} />
        <Bar
          dataKey="income"
          name="income"
          fill={`url(#${incomeGradient})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          style={{ filter: `url(#${shadowFilter})` }}
        >
          <LabelList dataKey="incomeRaw" position="top" content={ValueLabel} />
        </Bar>
        <Bar
          dataKey="expense"
          name="expense"
          fill={`url(#${expenseGradient})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          style={{ filter: `url(#${shadowFilter})` }}
        >
          <LabelList dataKey="expenseRaw" position="top" content={ValueLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
