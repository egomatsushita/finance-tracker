import { describe, expect, it } from 'vitest'
import { fillMonthGaps } from './trend'

describe('fillMonthGaps', () => {
  it('inserts zero-valued months for gaps between the first and last month', () => {
    const result = fillMonthGaps([
      { month: '2026-03', income: '3350.00', expense: '2275.00' },
      { month: '2026-11', income: '1200.00', expense: '100.00' },
    ])

    expect(result.map((m) => m.month)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    // Original months are preserved.
    expect(result[0]).toEqual({ month: '2026-03', income: '3350.00', expense: '2275.00' })
    expect(result[8]).toEqual({ month: '2026-11', income: '1200.00', expense: '100.00' })
    // Gap months are filled with zeros.
    expect(result[1]).toEqual({ month: '2026-04', income: '0.00', expense: '0.00' })
  })

  it('crosses year boundaries', () => {
    const result = fillMonthGaps([
      { month: '2025-11', income: '10.00', expense: '5.00' },
      { month: '2026-02', income: '20.00', expense: '8.00' },
    ])

    expect(result.map((m) => m.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('leaves contiguous months unchanged', () => {
    const input = [
      { month: '2026-01', income: '1.00', expense: '1.00' },
      { month: '2026-02', income: '2.00', expense: '2.00' },
    ]
    expect(fillMonthGaps(input)).toEqual(input)
  })

  it('sorts input defensively before filling', () => {
    const result = fillMonthGaps([
      { month: '2026-11', income: '1200.00', expense: '100.00' },
      { month: '2026-09', income: '5.00', expense: '2.00' },
    ])

    expect(result.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(result[0]).toEqual({ month: '2026-09', income: '5.00', expense: '2.00' })
  })

  it('returns a single month or empty input unchanged', () => {
    expect(fillMonthGaps([])).toEqual([])
    const one = [{ month: '2026-05', income: '1.00', expense: '1.00' }]
    expect(fillMonthGaps(one)).toEqual(one)
  })
})
