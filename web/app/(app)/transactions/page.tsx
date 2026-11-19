import { TransactionsClient } from './TransactionsClient'

// Auth gating and data fetching are both client-side (see (app)/layout.tsx and
// TransactionsClient), so this route can never produce a static instant shell.
export const instant = false

export default function TransactionsPage() {
  return <TransactionsClient />
}
