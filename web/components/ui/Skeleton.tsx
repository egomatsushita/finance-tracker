export function Skeleton({ className = '', announce = true }: { className?: string; announce?: boolean }) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-label={announce ? 'Loading' : undefined}
      aria-hidden={announce ? undefined : true}
      className={`animate-pulse rounded-md bg-muted-border ${className}`}
    />
  )
}

export function AppShellSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen bg-ground">
      <div className="hidden w-64 flex-col gap-4 border-r border-muted-border bg-surface p-4 md:flex">
        <Skeleton announce={false} className="h-8 w-32" />
        <Skeleton announce={false} className="h-6 w-full" />
        <Skeleton announce={false} className="h-6 w-full" />
        <Skeleton announce={false} className="h-6 w-full" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center border-b border-muted-border bg-surface px-4 md:hidden">
          <Skeleton announce={false} className="h-6 w-32" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton announce={false} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
