import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { fmtDate } from '../utils'
import type { Item, Location, Movement, MovementType } from '../types'

interface MovementForm {
  item_id: string
  movement_type: MovementType
  quantity: string
  location_from_id: string
  location_to_id: string
  reference: string
  performed_by: string
  notes: string
}

const EMPTY_FORM: MovementForm = {
  item_id: '',
  movement_type: 'receipt',
  quantity: '',
  location_from_id: '',
  location_to_id: '',
  reference: '',
  performed_by: '',
  notes: '',
}

function movementBadgeClass(type: MovementType): string {
  if (type === 'receipt' || type === 'initial_stock') return 'badge-ordered'
  if (type === 'issue') return 'badge-open'
  return 'badge-acknowledged'
}

export default function Movements() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<MovementForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [filterItem, setFilterItem] = useState('')
  const [filterType, setFilterType] = useState('')

  const { data: items = [], isPending: itemsPending } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.get<Item[]>('/items/'),
  })

  const itemId = form.item_id || (items.length > 0 ? String(items[0].id) : '')

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get<Location[]>('/locations/'),
  })

  const movementsUrl = '/movements/?limit=50' +
    (filterItem ? '&item_id=' + filterItem : '') +
    (filterType ? '&movement_type=' + filterType : '')

  const { data: movements = [] } = useQuery<Movement[]>({
    queryKey: ['movements', filterItem, filterType],
    queryFn: () => api.get<Movement[]>(movementsUrl),
  })

  const submitMovement = useMutation({
    mutationFn: (body: unknown) => api.post('/movements/', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setForm(prev => ({ ...prev, quantity: '', reference: '', performed_by: '', notes: '', location_from_id: '', location_to_id: '' }))
    },
    onError: (e) => setFormError((e as Error).message),
  })

  function handleSubmit() {
    setFormError('')
    const qty = parseFloat(form.quantity)
    if (!qty || qty <= 0) { setFormError('Quantity must be greater than 0'); return }

    const signedQty = (form.movement_type === 'issue' || form.movement_type === 'transfer')
      ? -Math.abs(qty) : Math.abs(qty)

    submitMovement.mutate({
      item_id: parseInt(itemId),
      movement_type: form.movement_type,
      quantity: signedQty,
      location_from_id: form.location_from_id ? parseInt(form.location_from_id) : null,
      location_to_id: form.location_to_id ? parseInt(form.location_to_id) : null,
      reference: form.reference.trim() || null,
      performed_by: form.performed_by.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  const setField = <K extends keyof MovementForm>(field: K, value: MovementForm[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (itemsPending) return <div className="empty-state">Loading…</div>

  return (
    <>
      <div className="page-title">Stock Movements</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        <div className="form-card">
          <h2>Record Movement</h2>
          <div className="form-row">
            <label>Item *</label>
            <select value={itemId} onChange={e => setField('item_id', e.target.value)}>
              {items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Type *</label>
              <select value={form.movement_type} onChange={e => setField('movement_type', e.target.value as MovementType)}>
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
            <button className="btn btn-primary" onClick={handleSubmit}>Save Movement</button>
          </div>
        </div>

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
