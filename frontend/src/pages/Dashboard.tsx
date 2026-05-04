import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { CritBadge, StockDot, currency } from '../utils'
import type { DashboardSummary } from '../types'

type Period = 7 | 30

function healthColor(pct: number) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 60) return 'var(--warning)'
  return 'var(--danger)'
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>(7)

  const { data: summary, isPending, isError, error } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', period],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?period=${period}`),
  })

  if (isPending) return <div className="empty-state">Loading…</div>
  if (isError) return <div className="empty-state">{(error as Error).message}</div>

  return (
    <>
      <div className="page-title">Dashboard</div>

      {/* ── Current-state KPIs ─────────────────────────────────────────── */}
      <div className="cards">
        <div className="card">
          <div className="label">Total SKUs</div>
          <div className="value">{summary.total_skus}</div>
        </div>
        <div className="card">
          <div className="label">Inventory Value</div>
          <div className="value value-md">{currency(summary.total_inventory_value)}</div>
        </div>
        <div className="card">
          <div className="label">Stock Health</div>
          <div className="value" style={{ color: healthColor(summary.stock_health_pct) }}>
            {summary.stock_health_pct}%
          </div>
        </div>
        <div className="card warn-card">
          <div className="label">Below Reorder</div>
          <div className="value">{summary.items_below_reorder}</div>
        </div>
        <div className="card alert-card">
          <div className="label">Open Alerts</div>
          <div className="value">{summary.open_alerts}</div>
        </div>
      </div>

      {/* ── Activity (time-scoped) ─────────────────────────────────────── */}
      <div className="dash-section-header">
        <span className="dash-section-label">Activity</span>
        <div className="period-tabs">
          <button
            className={`period-tab${period === 7 ? ' active' : ''}`}
            onClick={() => setPeriod(7)}
          >
            7 days
          </button>
          <button
            className={`period-tab${period === 30 ? ' active' : ''}`}
            onClick={() => setPeriod(30)}
          >
            30 days
          </button>
        </div>
      </div>
      <div className="cards cards-4">
        <div className="card">
          <div className="label">Total Movements</div>
          <div className="value">{summary.activity.movements_total}</div>
        </div>
        <div className="card">
          <div className="label">Receipts</div>
          <div className="value" style={{ color: 'var(--success)' }}>{summary.activity.receipts}</div>
        </div>
        <div className="card">
          <div className="label">Issues</div>
          <div className="value">{summary.activity.issues}</div>
        </div>
        <div className="card alert-card">
          <div className="label">Alerts Opened</div>
          <div className="value">{summary.activity.alerts_opened}</div>
        </div>
      </div>

      {/* ── Critical Low-Stock table ───────────────────────────────────── */}
      <div className="table-wrap">
        <div className="table-section-header">
          <div className="section-title">Critical Low-Stock Items</div>
          <Link to="/alerts" className="view-all-link">View all alerts →</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Criticality</th>
              <th>On Hand</th>
              <th>Reorder Pt.</th>
              <th>Supplier</th>
              <th>Lead Time</th>
            </tr>
          </thead>
          <tbody>
            {summary.low_stock_items.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">All items are sufficiently stocked</td>
              </tr>
            ) : summary.low_stock_items.map(item => (
              <tr key={item.id}>
                <td className="mono">{item.sku}</td>
                <td>{item.name}</td>
                <td><CritBadge value={item.criticality} /></td>
                <td>
                  <StockDot item={{ is_below_reorder: true, quantity_on_hand: item.quantity_on_hand, reorder_point: item.reorder_point }} />
                  <strong>{item.quantity_on_hand}</strong>
                </td>
                <td>{item.reorder_point}</td>
                <td className="tag">{item.supplier_name || '—'}</td>
                <td className="tag">{item.lead_time_days != null ? `${item.lead_time_days}d` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
