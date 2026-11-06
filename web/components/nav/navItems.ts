import { ArrowLeftRight, Home, UserRound, type LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/profile', label: 'Profile', icon: UserRound },
]
