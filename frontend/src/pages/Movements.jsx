import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { fmtDate } from '../utils'

const EMPTY_FORM = {
  item_id: '',
  movement_type: 'receipt',
  quantity: '',
  location_from_id: '',
  location_to_id: '',
  reference: '',
  performed_by: '',
  notes: '',
}

function movementBadgeClass(type) {
  if (type === 'receipt' || type === 'initial_stock') return 'badge-ordered'
  if (type === 'issue') return 'badge-open'
  return 'badge-acknowledged'
}

export default function Movements() {
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [movements, setMovements] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [filterItem, setFilterItem] = useState('')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)

  const loadMovements = useCallback(async (itemId, type) => {
    let url = '/movements/?limit=50'
    if (itemId) url += '&item_id=' + itemId
    if (type) url += '&movement_type=' + type
    const data = await api.get(url)
    setMovements(data)
  }, [])

  useEffect(() => {
    Promise.all([api.get('/items/'), api.get('/locations/')]).then(([itemsData, locsData]) => {
      setItems(itemsData)
      setLocations(locsData)
      if (itemsData.length > 0) setForm(prev => ({ ...prev, item_id: String(itemsData[0].id) }))
      setLoading(false)
    })
    loadMovements('', '')
  }, [loadMovements])

  useEffect(() => {
    if (!loading) loadMovements(filterItem, filterType)
  }, [filterItem, filterType, loading, loadMovements])

  async function submitMovement() {
    setFormError('')
    const qty = parseFloat(form.quantity)
    if (!qty || qty <= 0) { setFormError('Quantity must be greater than 0'); return }

    const signedQty = (form.movement_type === 'issue' || form.movement_type === 'transfer')
      ? -Math.abs(qty) : Math.abs(qty)

    const body = {
      item_id: parseInt(form.item_id),
      movement_type: form.movement_type,
      quantity: signedQty,
      location_from_id: form.location_from_id ? parseInt(form.location_from_id) : null,
      location_to_id: form.location_to_id ? parseInt(form.location_to_id) : null,
      reference: form.reference.trim() || null,
      performed_by: form.performed_by.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      await api.post('/movements/', body)
      setForm(prev => ({ ...prev, quantity: '', reference: '', performed_by: '', notes: '', location_from_id: '', location_to_id: '' }))
      loadMovements(filterItem, filterType)
    } catch (e) {
      setFormError(e.message)
    }
  }

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return <div className="empty-state">Loading…</div>

  return (
    <>
      <div className="page-title">Stock Movements</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Record movement form */}
        <div className="form-card">
          <h2>Record Movement</h2>
          <div className="form-row">
            <label>Item *</label>
            <select value={form.item_id} onChange={e => setField('item_id', e.target.value)}>
              {items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Type *</label>
              <select value={form.movement_type} onChange={e => setField('movement_type', e.target.value)}>
                <option value="receipt">Receipt</option>
                <option value="issue">Issue</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div className="form-row">
              <label>Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => setField('quantity', e.target.value)} step="0.001" min="0.001" placeholder="e.g. 5" />
            </div>
            <div className="form-row">
              <label>From Location</label>
              <select value={form.location_from_id} onChange={e => setField('location_from_id', e.target.value)}>
                <option value="">— none —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>To Location</label>
              <select value={form.location_to_id} onChange={e => setField('location_to_id', e.target.value)}>
                <option value="">— none —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Reference (PO/WO/REQ number)</label>
            <input type="text" value={form.reference} onChange={e => setField('reference', e.target.value)} placeholder="e.g. WO-2026-0301" />
          </div>
          <div className="form-row">
            <label>Performed By</label>
            <input type="text" value={form.performed_by} onChange={e => setField('performed_by', e.target.value)} placeholder="Name or role" />
          </div>
          <div className="form-row">
            <label>
              Notes{' '}
              {form.movement_type === 'adjustment' && (
                <span style={{ color: 'var(--warning)' }}>(required for adjustment)</span>
              )}
            </label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} placeholder="Reason, batch number, etc." />
          </div>
          {formError && <div className="error-msg">{formError}</div>}
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={submitMovement}>Save Movement</button>
          </div>
        </div>

        {/* Recent movements */}
        <div>
          <div className="toolbar" style={{ marginBottom: '12px' }}>
            <select className="filter" value={filterItem} onChange={e => setFilterItem(e.target.value)} style={{ flex: 1 }}>
              <option value="">All Items</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
            </select>
            <select className="filter" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="receipt">Receipt</option>
              <option value="issue">Issue</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
              <option value="initial_stock">Initial Stock</option>
            </select>
          </div>
          <div className="table-wrap">
            <div className="section-title">Recent Movements</div>
            <table>
              <thead>
                <tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Reference</th></tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No movements found</td></tr>
                ) : movements.map(m => {
                  const sign = m.quantity > 0 ? '+' : ''
                  const color = m.quantity > 0 ? 'var(--success)' : m.quantity < 0 ? 'var(--danger)' : 'var(--text-muted)'
                  return (
                    <tr key={m.id}>
                      <td className="tag">{fmtDate(m.timestamp)}</td>
                      <td>
                        <span className="mono">{m.item_sku}</span>
                        <br />
                        <span className="tag">{m.item_name}</span>
                      </td>
                      <td>
                        <span className={`badge ${movementBadgeClass(m.movement_type)}`}>{m.movement_type}</span>
                      </td>
                      <td style={{ color, fontWeight: 600 }}>{sign}{m.quantity}</td>
                      <td className="tag">{m.reference || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
