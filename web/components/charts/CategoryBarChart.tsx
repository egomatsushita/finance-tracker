import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Props as RechartsLabelProps } from 'recharts/types/component/Label'
import type { TooltipContentProps } from 'recharts/types/component/Tooltip'
import { formatCategoryLabel, formatMoney } from '@/lib/format'
import type { TransactionSummary } from '@/lib/types'

const BAR_HEIGHT = 32
const BAR_GAP = 16

// Identity here is already carried by the y-axis category label, not color —
// per the dataviz skill, color should only encode identity when there's no
// other way to tell marks apart (e.g. donut/pie slices). A ranked bar list
// doesn't need 8 separate hues (which read as "busy"), just one.
function ValueLabel({ x, y, width, value }: RechartsLabelProps) {
  if (x === undefined || y === undefined || width === undefined || value === undefined || value === null) {
    return null
  }
  const text = formatMoney(String(value))
  return (
    <text
      x={Number(x) + Number(width) + 8}
      y={Number(y) + BAR_HEIGHT / 2}
      textAnchor="start"
      dominantBaseline="middle"
      fontSize={12}
      className="font-mono"
      fill="var(--ink)"
    >
      {text}
    </text>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0]
  const value = Array.isArray(entry.value) ? entry.value[0] : entry.value
  return (
    <div className="rounded-xl bg-[#111827] px-3 py-2 text-sm text-white shadow-xl">
      {formatCategoryLabel(String(entry.payload?.category ?? ''))}: {formatMoney(String(value ?? 0))}
    </div>
  )
}

export function CategoryBarChart({ data }: { data: TransactionSummary['by_category'] }) {
  const shadowId = useId()
  const expenseData = [...data]
    .filter((d) => d.kind === 'expense')
    .sort((a, b) => Number(b.total) - Number(a.total))
    .map((d) => ({ ...d, totalValue: Number(d.total) }))

  if (expenseData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-text">
        No expenses yet
      </div>
    )
  }

  const gradientId = `${shadowId}-expense`
  const shadowFilter = `${shadowId}-bar-shadow`
  const chartHeight = expenseData.length * (BAR_HEIGHT + BAR_GAP) + 24

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={expenseData}
        layout="vertical"
        barCategoryGap={BAR_GAP}
        margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.85} />
            <stop offset="100%" stopColor="var(--expense)" stopOpacity={1} />
          </linearGradient>
          <filter id={shadowFilter} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity={0.25} />
          </filter>
        </defs>
        <CartesianGrid stroke="var(--muted-border)" strokeWidth={1} horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          tickFormatter={(value) => formatCategoryLabel(String(value))}
          stroke="var(--muted-text)"
          tick={{ fill: 'var(--ink)' }}
          width={100}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip content={ChartTooltip} cursor={{ fill: 'var(--muted-border)', opacity: 0.3 }} />
        <Bar
          dataKey="totalValue"
          fill={`url(#${gradientId})`}
          radius={[0, 4, 4, 0]}
          barSize={BAR_HEIGHT}
          style={{ filter: `url(#${shadowFilter})` }}
          isAnimationActive={false}
        >
          <LabelList dataKey="totalValue" content={ValueLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
