export function formatMoney(value: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
