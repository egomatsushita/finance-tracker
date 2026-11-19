import { Button } from '@/components/ui/Button'

type PaginationProps = {
  offset: number
  rowCount: number
  limit: number
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({ offset, rowCount, limit, onPrevious, onNext }: PaginationProps) {
  const hasNext = rowCount === limit

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={onPrevious} disabled={offset === 0}>
        Previous
      </Button>
      <Button variant="secondary" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  )
}
