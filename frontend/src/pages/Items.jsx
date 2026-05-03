import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { CritBadge, StockDot, currency } from '../utils'

const EMPTY_FORM = {
  sku: '', name: '', description: '', unit_of_measure: 'each',
  unit_cost: '', criticality: 'standard',
  reorder_point: '', reorder_quantity: '', lead_time_days: '',
  category_id: '', default_supplier_id: '',
}

export default function Items() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [critFilter, setCritFilter] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | item object
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [itemsData, catsData] = await Promise.all([
      api.get('/items/'),
      api.get('/categories/'),
    ])
    setItems(itemsData)
    setCategories(catsData)
    setLoading(false)
  }

  const filtered = useMemo(() => items.filter(i =>
    (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || String(i.category_id) === catFilter) &&
    (!critFilter || i.criticality === critFilter)
  ), [items, search, catFilter, critFilter])

  async function openNew() {
    const [catsData, supsData] = await Promise.all([api.get('/categories/'), api.get('/suppliers/')])
    setCategories(catsData)
    setSuppliers(supsData)
    setForm(EMPTY_FORM)
    setFormError('')
    setModal('new')
  }

  async function openEdit(item) {
    const [catsData, supsData, full] = await Promise.all([
      api.get('/categories/'),
      api.get('/suppliers/'),
      api.get('/items/' + item.id),
    ])
    setCategories(catsData)
    setSuppliers(supsData)
    setForm({
      sku: full.sku,
      name: full.name,
      description: full.description || '',
      unit_of_measure: full.unit_of_measure,
      unit_cost: full.unit_cost,
      criticality: full.criticality,
      reorder_point: full.reorder_point,
      reorder_quantity: full.reorder_quantity,
      lead_time_days: full.lead_time_days || '',
      category_id: full.category_id || '',
      default_supplier_id: full.default_supplier_id || '',
    })
    setFormError('')
    setModal(full)
  }

  async function saveItem() {
    setFormError('')
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit_of_measure: form.unit_of_measure.trim() || 'each',
      unit_cost: parseFloat(form.unit_cost) || 0,
      criticality: form.criticality,
      reorder_point: parseInt(form.reorder_point) || 0,
      reorder_quantity: parseInt(form.reorder_quantity) || 0,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      default_supplier_id: form.default_supplier_id ? parseInt(form.default_supplier_id) : null,
    }
    try {
      if (modal !== 'new') await api.put('/items/' + modal.id, body)
      else await api.post('/items/', body)
      setModal(null)
      load()
    } catch (e) {
      setFormError(e.message)
    }
  }

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return <div className="empty-state">Loading…</div>

  return (
    <>
      <div className="page-title">Items</div>
      <div className="toolbar">
        <input
          className="search-box"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="filter" value={critFilter} onChange={e => setCritFilter(e.target.value)}>
          <option value="">All Criticality</option>
          <option value="critical">Critical</option>
          <option value="important">Important</option>
          <option value="standard">Standard</option>
        </select>
        <button className="btn btn-primary" onClick={openNew}>+ New Item</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th><th>Name</th><th>Category</th><th>Criticality</th>
              <th>On Hand</th><th>Reorder Pt.</th><th>Unit Cost</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No items found</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id}>
                <td className="mono">{item.sku}</td>
                <td>
                  {item.name}
                  {item.description && <><br /><span className="tag">{item.description}</span></>}
                </td>
                <td className="tag">{item.category_name || '—'}</td>
                <td><CritBadge value={item.criticality} /></td>
                <td>
                  <StockDot item={item} />
                  <strong>{item.quantity_on_hand}</strong> {item.unit_of_measure}
                </td>
                <td>{item.reorder_point}</td>
                <td>{currency(item.unit_cost)}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'New Item' : 'Edit Item'} onClose={() => setModal(null)}>
          <div className="form-grid">
            <div className="form-row">
              <label>SKU *</label>
              <input type="text" value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="e.g. BRG-SKF-6205" />
            </div>
            <div className="form-row">
              <label>Unit of Measure *</label>
              <input type="text" value={form.unit_of_measure} onChange={e => setField('unit_of_measure', e.target.value)} placeholder="each / kg / litre…" />
            </div>
            <div className="form-row full">
              <label>Name *</label>
              <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="form-row full">
              <label>Description</label>
              <input type="text" value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Category</label>
              <select value={form.category_id} onChange={e => setField('category_id', e.target.value)}>
                <option value="">— none —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Default Supplier</label>
              <select value={form.default_supplier_id} onChange={e => setField('default_supplier_id', e.target.value)}>
                <option value="">— none —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Unit Cost (S/.)</label>
              <input type="number" value={form.unit_cost} onChange={e => setField('unit_cost', e.target.value)} step="0.01" min="0" />
            </div>
            <div className="form-row">
              <label>Criticality</label>
              <select value={form.criticality} onChange={e => setField('criticality', e.target.value)}>
                <option value="critical">Critical</option>
                <option value="important">Important</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div className="form-row">
              <label>Reorder Point</label>
              <input type="number" value={form.reorder_point} onChange={e => setField('reorder_point', e.target.value)} min="0" step="1" />
            </div>
            <div className="form-row">
              <label>Reorder Quantity</label>
              <input type="number" value={form.reorder_quantity} onChange={e => setField('reorder_quantity', e.target.value)} min="0" step="1" />
            </div>
            <div className="form-row">
              <label>Lead Time Override (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setField('lead_time_days', e.target.value)} min="1" step="1" placeholder="Leave blank = supplier default" />
            </div>
          </div>
          {formError && <div className="error-msg">{formError}</div>}
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveItem}>Save</button>
          </div>
        </Modal>
      )}
    </>
  )
}
