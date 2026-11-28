import type { TransactionSummary } from './types'

type MonthPoint = TransactionSummary['by_month'][number]

// by_month only contains months that have transactions, so a chart plotting it
// directly draws non-adjacent months with equal spacing — hiding gaps. Fill the
// range between the first and last month with zero-valued months so the x-axis
// reflects the real timeline. Assumes the input is sorted ascending by month.
export function fillMonthGaps(months: MonthPoint[]): MonthPoint[] {
  if (months.length <= 1) return months

  const byKey = new Map(months.map((m) => [m.month, m]))
  const [startYear, startMonth] = months[0].month.split('-').map(Number)
  const [endYear, endMonth] = months[months.length - 1].month.split('-').map(Number)

  const result: MonthPoint[] = []
  let year = startYear
  let month = startMonth
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    result.push(byKey.get(key) ?? { month: key, income: '0.00', expense: '0.00' })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return result
}
