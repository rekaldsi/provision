import { useState, useEffect } from 'react'
import { Fuel, ExternalLink, TrendingDown, AlertCircle } from 'lucide-react'

const API = '/api'

interface GasData {
  zip: string
  area_average: {
    area: string
    regular: number
    midgrade?: number
    premium?: number
    diesel?: number
    source: string
    updated: string
  } | null
  warehouse_gas: Array<{
    name: string
    note: string
    typical_savings: number
    url: string
    requires_membership: boolean
    effective_price: number | null
  }>
  jewel_fuel_rewards: {
    points: number
    cents_per_gallon: number
    dollars_per_gallon: string
    max_savings_per_fillup: string
    threshold_alert: boolean
    redemption_note: string
    expires_note: string
    stations: string
  } | null
  tip: string
  gasbuddy_url: string
}

export function Gas() {
  const [gasData, setGasData] = useState<GasData | null>(null)
  const [loading, setLoading] = useState(false)
  const [zip, setZip] = useState('60646')
  const [fuelPoints, setFuelPoints] = useState('')
  const [checked, setChecked] = useState(false)

  async function fetchGas() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ zip })
      if (fuelPoints) params.set('fuel_points', fuelPoints)
      const r = await fetch(`${API}/gas?${params}`)
      const d = await r.json()
      setGasData(d)
      setChecked(true)
    } catch { /* noop */ }
    setLoading(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Fuel size={18} className="text-provision-savings" />
          <h1 className="text-xl font-bold text-provision-text">Gas Intelligence</h1>
        </div>
        <p className="text-provision-dim text-sm">Sam's Club · Costco · Jewel Fuel Rewards</p>
      </div>

      {/* Input form */}
      <div className="bg-provision-surface border border-provision-border rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-provision-dim mb-1 block">ZIP Code</label>
            <input
              className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text focus:outline-none focus:border-provision-savings"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="60646"
              maxLength={5}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-provision-dim mb-1 block">Jewel Fuel Points</label>
            <input
              className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text focus:outline-none focus:border-provision-savings"
              value={fuelPoints}
              onChange={e => setFuelPoints(e.target.value)}
              placeholder="e.g. 250"
              type="number"
            />
          </div>
        </div>
        <button
          onClick={fetchGas}
          disabled={loading}
          className="w-full py-2.5 bg-provision-savings text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-green-300 transition-colors"
        >
          {loading ? 'Checking prices...' : 'Check Gas Prices'}
        </button>
      </div>

      {/* Results */}
      {gasData && (
        <div className="space-y-3">
          {/* Area average */}
          {gasData.area_average ? (
            <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
              <p className="text-xs text-provision-dim uppercase tracking-wide mb-2">Area Average (ZIP {gasData.zip})</p>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <p className="text-2xl font-bold text-provision-text">${gasData.area_average.regular?.toFixed(3)}</p>
                  <p className="text-xs text-provision-dim">Regular</p>
                </div>
                {gasData.area_average.midgrade && (
                  <div>
                    <p className="text-lg font-semibold text-provision-dim">${gasData.area_average.midgrade.toFixed(3)}</p>
                    <p className="text-xs text-provision-dim">Midgrade</p>
                  </div>
                )}
                {gasData.area_average.premium && (
                  <div>
                    <p className="text-lg font-semibold text-provision-dim">${gasData.area_average.premium.toFixed(3)}</p>
                    <p className="text-xs text-provision-dim">Premium</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-provision-dim mt-2">via GasBuddy</p>
            </div>
          ) : (
            <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-yellow-500" />
                <p className="text-sm text-provision-dim">Live prices unavailable — check GasBuddy directly</p>
              </div>
              <a
                href={gasData.gasbuddy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-provision-savings hover:underline"
              >
                GasBuddy Chicago <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Warehouse gas */}
          <div className="space-y-2">
            <p className="text-xs text-provision-dim uppercase tracking-wide font-medium">Warehouse Savings</p>
            {gasData.warehouse_gas.map((wg, i) => (
              <div key={i} className="bg-provision-surface border border-provision-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-provision-text text-sm">{wg.name}</p>
                  {wg.effective_price && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-provision-savings">~${wg.effective_price.toFixed(3)}</p>
                      <p className="text-xs text-provision-dim">est. price</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown size={12} className="text-provision-savings" />
                  <span className="text-xs text-provision-savings">Saves ~${wg.typical_savings.toFixed(2)}/gal</span>
                  {wg.requires_membership && <span className="text-xs text-yellow-500 ml-1">· Membership required</span>}
                </div>
                <p className="text-xs text-provision-dim">{wg.note}</p>
                <a
                  href={wg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-provision-savings hover:underline mt-2"
                >
                  View pump prices <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>

          {/* Jewel Fuel Rewards */}
          {gasData.jewel_fuel_rewards ? (
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
              <p className="text-xs text-provision-savings uppercase tracking-wide font-medium mb-2">Jewel Fuel Rewards</p>
              <p className="text-xl font-bold text-provision-savings">${gasData.jewel_fuel_rewards.dollars_per_gallon}/gal off</p>
              <p className="text-sm text-provision-text mt-1">{gasData.jewel_fuel_rewards.redemption_note}</p>
              <p className="text-xs text-provision-dim mt-1">{gasData.jewel_fuel_rewards.expires_note}</p>
              <p className="text-xs text-provision-dim mt-1">📍 {gasData.jewel_fuel_rewards.stations}</p>
            </div>
          ) : fuelPoints === '' && (
            <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
              <p className="text-sm text-provision-dim">Enter your Jewel Fuel Points balance above to calculate savings</p>
              <p className="text-xs text-provision-dim mt-1">Check balance: Jewel app or receipt footer</p>
            </div>
          )}

          {/* Tip */}
          <div className="bg-provision-surface border border-provision-border rounded-lg p-3">
            <p className="text-xs text-provision-dim">{gasData.tip}</p>
          </div>
        </div>
      )}

      {!gasData && !loading && (
        <div className="text-center py-10">
          <Fuel size={32} className="text-provision-muted mx-auto mb-3" />
          <p className="text-provision-dim text-sm">Enter your ZIP and check current gas prices</p>
          <p className="text-provision-dim text-xs mt-1">Sam's Club and Costco typically beat area average</p>
        </div>
      )}
    </div>
  )
}
