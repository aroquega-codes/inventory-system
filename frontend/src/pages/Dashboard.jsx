import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { CritBadge, StockDot, currency } from '../utils'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/dashboard/summary').then(setSummary).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="empty-state">{error}</div>
  if (!summary) return <div className="empty-state">Loading…</div>

  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="cards">
        <div className="card">
          <div className="label">Total SKUs</div>
          <div className="value">{summary.total_skus}</div>
        </div>
        <div className="card">
          <div className="label">Active Items</div>
          <div className="value">{summary.active_items}</div>
        </div>
        <div className="card warn-card">
          <div className="label">Below Reorder</div>
          <div className="value">{summary.items_below_reorder}</div>
        </div>
        <div className="card alert-card">
          <div className="label">Open Alerts</div>
          <div className="value">{summary.open_alerts}</div>
        </div>
        <div className="card">
          <div className="label">Inventory Value</div>
          <div className="value" style={{ fontSize: '18px' }}>{currency(summary.total_inventory_value)}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="section-title">Critical Low-Stock Items</div>
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
