export function formatMoney(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, m - 1, 1)))
}

export function formatMonthShort(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, m - 1, 1)))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}
