import {
  Briefcase,
  Building2,
  Car,
  Film,
  Gift,
  HeartPulse,
  House,
  MoreHorizontal,
  PiggyBank,
  ShoppingCart,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TransactionCategory } from './types'

const CATEGORY_ICONS: Record<TransactionCategory, LucideIcon> = {
  housing: House,
  utilities: Zap,
  groceries: ShoppingCart,
  transport: Car,
  health: HeartPulse,
  entertainment: Film,
  savings: PiggyBank,
  other: MoreHorizontal,
  salary: Briefcase,
  investment: TrendingUp,
  rental: Building2,
  gift: Gift,
}

export function getCategoryIcon(category: TransactionCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? MoreHorizontal
}
