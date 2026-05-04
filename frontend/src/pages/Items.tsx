import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { CritBadge, StockDot, currency } from '../utils'
import type { Item, Category, Supplier, Criticality } from '../types'

interface ItemForm {
  sku: string
  name: string
  description: string
  unit_of_measure: string
  unit_cost: string
  criticality: Criticality
  reorder_point: string
  reorder_quantity: string
  lead_time_days: string
  category_id: string
  default_supplier_id: string
}

const EMPTY_FORM: ItemForm = {
  sku: '', name: '', description: '', unit_of_measure: 'each',
  unit_cost: '', criticality: 'standard',
  reorder_point: '', reorder_quantity: '', lead_time_days: '',
  category_id: '', default_supplier_id: '',
}

export default function Items() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [critFilter, setCritFilter] = useState('')
  const [sort, setSort] = useState('name:asc')
  const [modal, setModal] = useState<null | 'new' | Item>(null)
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const { data: items = [], isPending: itemsPending } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.get<Item[]>('/items/'),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories/'),
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/suppliers/'),
    enabled: !!modal,
  })

  const saveItem = useMutation({
    mutationFn: (body: unknown) =>
      modal !== 'new' && modal !== null
        ? api.put('/items/' + modal.id, body)
        : api.post('/items/', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setModal(null)
    },
    onError: (e) => setFormError((e as Error).message),
  })

  const filtered = useMemo(() => {
    const result = items.filter(i =>
      (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())) &&
      (!catFilter || String(i.category_id) === catFilter) &&
      (!critFilter || i.criticality === critFilter)
    )
    const [key, dir] = sort.split(':')
    result.sort((a, b) => {
      const cmp = key === 'name' ? a.name.localeCompare(b.name) : a.id - b.id
      return dir === 'asc' ? cmp : -cmp
    })
    return result
  }, [items, search, catFilter, critFilter, sort])

  async function openEdit(item: Item) {
    const full = await api.get<Item>('/items/' + item.id)
    setForm({
      sku: full.sku,
      name: full.name,
      description: full.description || '',
      unit_of_measure: full.unit_of_measure,
      unit_cost: String(full.unit_cost),
      criticality: full.criticality,
      reorder_point: String(full.reorder_point),
      reorder_quantity: String(full.reorder_quantity),
      lead_time_days: full.lead_time_days != null ? String(full.lead_time_days) : '',
      category_id: full.category_id != null ? String(full.category_id) : '',
      default_supplier_id: full.default_supplier_id != null ? String(full.default_supplier_id) : '',
    })
    setFormError('')
    setModal(full)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal('new')
  }

  function handleSave() {
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
    saveItem.mutate(body)
  }

  const setField = <K extends keyof ItemForm>(field: K, value: ItemForm[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (itemsPending) return <div className="empty-state">Loading…</div>

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
        <div className="toolbar-filters">
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
          <select className="filter" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name:asc">Name A→Z</option>
            <option value="name:desc">Name Z→A</option>
            <option value="id:desc">Newest First</option>
            <option value="id:asc">Oldest First</option>
          </select>
        </div>
        {!isMobile && <button className="btn btn-primary" onClick={openNew}>+ New Item</button>}
      </div>

      {isMobile && createPortal(
        <button className="fab" onClick={openNew} aria-label="New Item">
          <Plus size={24} />
        </button>,
        document.body
      )}

      <div className="table-wrap">
        {isMobile ? (
          <div data-testid="items-cards">
            {filtered.length === 0 ? (
              <div className="empty-state">No items found</div>
            ) : filtered.map(item => (
              <div key={item.id} className="item-card" data-testid={`item-card-${item.id}`}>
                <div className="item-card-header">
                  <div>
                    <div className="item-card-name">{item.name}</div>
                    <span className="mono">{item.sku}</span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>Edit</button>
                </div>
                <div className="item-card-meta">
                  <CritBadge value={item.criticality} />
                  {item.category_name && <span className="tag">{item.category_name}</span>}
                  <span>
                    <StockDot item={item} />
                    <strong>{item.quantity_on_hand}</strong> {item.unit_of_measure}
                  </span>
                  <span>{currency(item.unit_cost)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table data-testid="items-table">
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
                <tr key={item.id} data-testid={`item-row-${item.id}`}>
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
        )}
      </div>

      <Modal title={modal === 'new' ? 'New Item' : 'Edit Item'} open={!!modal} onClose={() => setModal(null)}>
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="item-sku">SKU *</label>
            <input id="item-sku" type="text" value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="e.g. BRG-SKF-6205" />
          </div>
          <div className="form-row">
            <label htmlFor="item-uom">Unit of Measure *</label>
            <input id="item-uom" type="text" value={form.unit_of_measure} onChange={e => setField('unit_of_measure', e.target.value)} placeholder="each / kg / litre…" />
          </div>
          <div className="form-row full">
            <label htmlFor="item-name">Name *</label>
            <input id="item-name" type="text" value={form.name} onChange={e => setField('name', e.target.value)} />
          </div>
          <div className="form-row full">
            <label htmlFor="item-description">Description</label>
            <input id="item-description" type="text" value={form.description} onChange={e => setField('description', e.target.value)} />
          </div>
          <div className="form-row">
            <label htmlFor="item-category">Category</label>
            <select id="item-category" value={form.category_id} onChange={e => setField('category_id', e.target.value)}>
              <option value="">— none —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="item-supplier">Default Supplier</label>
            <select id="item-supplier" value={form.default_supplier_id} onChange={e => setField('default_supplier_id', e.target.value)}>
              <option value="">— none —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="item-cost">Unit Cost (S/.)</label>
            <input id="item-cost" type="number" value={form.unit_cost} onChange={e => setField('unit_cost', e.target.value)} step="0.01" min="0" />
          </div>
          <div className="form-row">
            <label htmlFor="item-criticality">Criticality</label>
            <select id="item-criticality" value={form.criticality} onChange={e => setField('criticality', e.target.value as Criticality)}>
              <option value="critical">Critical</option>
              <option value="important">Important</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="item-reorder-point">Reorder Point</label>
            <input id="item-reorder-point" type="number" value={form.reorder_point} onChange={e => setField('reorder_point', e.target.value)} min="0" step="1" />
          </div>
          <div className="form-row">
            <label htmlFor="item-reorder-qty">Reorder Quantity</label>
            <input id="item-reorder-qty" type="number" value={form.reorder_quantity} onChange={e => setField('reorder_quantity', e.target.value)} min="0" step="1" />
          </div>
          <div className="form-row">
            <label htmlFor="item-lead-time">Lead Time Override (days)</label>
            <input id="item-lead-time" type="number" value={form.lead_time_days} onChange={e => setField('lead_time_days', e.target.value)} min="1" step="1" placeholder="Leave blank = supplier default" />
          </div>
        </div>
        {formError && <div className="error-msg">{formError}</div>}
        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>
    </>
  )
}
