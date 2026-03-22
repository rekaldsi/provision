import { PriceDecoder } from '@/components/PriceDecoder'

const SECTIONS = ['Penny Deals This Week', 'Online Clearance', 'Bulk Buys']

export function Clearance() {
  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <h1 className="text-xl font-bold text-provision-text">Clearance Intel</h1>
        <p className="text-sm text-provision-dim">Decode endings, track markdown cycles, and prepare buy windows.</p>
      </header>

      <PriceDecoder />

      {SECTIONS.map((section) => (
        <section key={section} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-provision-dim">{section}</h2>
          <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
            <p className="text-sm text-provision-dim">Coming soon</p>
          </div>
        </section>
      ))}
    </div>
  )
}
