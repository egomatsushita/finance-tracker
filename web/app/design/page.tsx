const colorTokens = [
  { name: 'Ground', className: 'bg-ground', role: 'Page background' },
  { name: 'Surface', className: 'bg-surface', role: 'Card background' },
  { name: 'Ink', className: 'bg-ink', role: 'Primary text' },
  { name: 'Muted text', className: 'bg-muted-text', role: 'Secondary text' },
  { name: 'Muted border', className: 'bg-muted-border', role: 'Borders / dividers' },
  { name: 'Brand', className: 'bg-brand', role: 'Primary interactive accent' },
  { name: 'Income', className: 'bg-income', role: 'Positive amounts' },
  { name: 'Expense', className: 'bg-expense', role: 'Negative amounts / alerts' },
  { name: 'Highlight', className: 'bg-highlight', role: 'Signature KPI figure (used sparingly)' },
];

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-ground px-6 py-12 text-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-10 text-3xl font-semibold tracking-tight">Design tokens</h1>

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-muted-text">Color palette</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {colorTokens.map((token) => (
              <div
                key={token.name}
                className="overflow-hidden rounded-lg border border-muted-border bg-surface shadow-sm"
              >
                <div className={`h-16 ${token.className}`} />
                <div className="p-3">
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-muted-text">{token.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-muted-text">Typography — IBM Plex Sans</h2>
          <div className="flex flex-col gap-3 rounded-lg border border-muted-border bg-surface p-6 shadow-sm">
            <p className="text-3xl font-normal">Regular 3xl — The quick brown fox</p>
            <p className="text-3xl font-medium">Medium 3xl — The quick brown fox</p>
            <p className="text-3xl font-semibold">Semibold 3xl — The quick brown fox</p>
            <p className="text-3xl font-bold">Bold 3xl — The quick brown fox</p>
            <p className="text-3xl italic">Italic 3xl — The quick brown fox</p>
            <p className="text-base font-normal">Regular base — The quick brown fox jumps over the lazy dog</p>
            <p className="text-sm font-normal text-muted-text">Small muted — The quick brown fox jumps over the lazy dog</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-muted-text">Typography — IBM Plex Mono (tabular figures)</h2>

          <div className="mb-4 rounded-lg border border-muted-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-muted-text">Net balance</p>
            <p className="font-mono text-4xl font-bold tabular-nums text-highlight">4,371.53</p>
          </div>

          <div className="rounded-lg border border-muted-border bg-surface p-6 font-mono text-sm shadow-sm">
            <div className="flex justify-between gap-8 border-b border-muted-border py-2">
              <span>Salary</span>
              <span className="tabular-nums text-income">+4,500.00</span>
            </div>
            <div className="flex justify-between gap-8 border-b border-muted-border py-2">
              <span>Groceries</span>
              <span className="tabular-nums text-expense">-128.47</span>
            </div>
            <div className="flex justify-between gap-8 py-2">
              <span>Net</span>
              <span className="tabular-nums text-ink">4,371.53</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
