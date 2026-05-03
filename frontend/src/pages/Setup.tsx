import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import Modal from '../components/Modal'
import type { Category, Supplier, Location } from '../types'

type TabName = 'categories' | 'suppliers' | 'locations'
type ModalType = 'cat' | 'sup' | 'loc'

interface SetupModal {
  type: ModalType
  record: Category | Supplier | Location | null
}

interface SetupForm {
  name: string
  description?: string
  contact?: string
  lead_time_days?: string | number
}

const TABS: TabName[] = ['categories', 'suppliers', 'locations']

function tabLabel(t: TabName): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function Setup() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabName>('categories')
  const [modal, setModal] = useState<SetupModal | null>(null)
  const [form, setForm] = useState<SetupForm>({ name: '' })
  const [formError, setFormError] = useState('')

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories/'),
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/suppliers/'),
  })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get<Location[]>('/locations/'),
  })

  const saveCategory = useMutation({
    mutationFn: (body: unknown) => modal?.record
      ? api.put('/categories/' + (modal.record as Category).id, body)
      : api.post('/categories/', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setModal(null) },
    onError: (e) => setFormError((e as Error).message),
  })

  const saveSupplier = useMutation({
    mutationFn: (body: unknown) => modal?.record
      ? api.put('/suppliers/' + (modal.record as Supplier).id, body)
      : api.post('/suppliers/', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null) },
    onError: (e) => setFormError((e as Error).message),
  })

  const saveLocation = useMutation({
    mutationFn: (body: unknown) => modal?.record
      ? api.put('/locations/' + (modal.record as Location).id, body)
      : api.post('/locations/', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setModal(null) },
    onError: (e) => setFormError((e as Error).message),
  })

  function openModal(type: ModalType, record: Category | Supplier | Location | null = null) {
    setFormError('')
    if (type === 'sup') {
      const s = record as Supplier | null
      setForm(s
        ? { name: s.name, contact: s.contact || '', lead_time_days: s.lead_time_days }
        : { name: '', contact: '', lead_time_days: 7 })
    } else {
      const r = record as Category | Location | null
      setForm(r
        ? { name: r.name, description: r.description || '' }
        : { name: '', description: '' })
    }
    setModal({ type, record })
  }

  function handleSave() {
    setFormError('')
    if (!modal) return
    const { type } = modal
    if (type === 'cat') {
      saveCategory.mutate({ name: form.name.trim(), description: (form.description ?? '').trim() || null })
    } else if (type === 'sup') {
      saveSupplier.mutate({ name: form.name.trim(), contact: (form.contact ?? '').trim() || null, lead_time_days: parseInt(String(form.lead_time_days ?? 7)) || 7 })
    } else {
      saveLocation.mutate({ name: form.name.trim(), description: (form.description ?? '').trim() || null })
    }
  }

  const setField = <K extends keyof SetupForm>(field: K, value: SetupForm[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const modalTitle = modal
    ? (modal.record ? 'Edit ' : 'New ') + (modal.type === 'cat' ? 'Category' : modal.type === 'sup' ? 'Supplier' : 'Location')
    : ''

  return (
    <>
      <div className="page-title">Setup</div>
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'categories' && (
        <>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => openModal('cat')}>+ New Category</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={3} className="empty-state">No categories</td></tr>
                ) : categories.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="tag">{c.description || '—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openModal('cat', c)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => openModal('sup')}>+ New Supplier</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Contact</th><th>Lead Time</th><th>Actions</th></tr></thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state">No suppliers</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="tag">{s.contact || '—'}</td>
                    <td>{s.lead_time_days} day{s.lead_time_days !== 1 ? 's' : ''}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openModal('sup', s)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'locations' && (
        <>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => openModal('loc')}>+ New Location</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr><td colSpan={3} className="empty-state">No locations</td></tr>
                ) : locations.map(l => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td className="tag">{l.description || '—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openModal('loc', l)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal title={modalTitle} open={!!modal} onClose={() => setModal(null)}>
        <div className="form-row">
          <label>Name *</label>
          <input type="text" value={form.name || ''} onChange={e => setField('name', e.target.value)} />
        </div>
        {modal?.type === 'sup' ? (
          <>
            <div className="form-row">
              <label>Contact</label>
              <input type="text" value={form.contact || ''} onChange={e => setField('contact', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Lead Time (days) *</label>
              <input type="number" value={form.lead_time_days || ''} onChange={e => setField('lead_time_days', e.target.value)} min="1" />
            </div>
          </>
        ) : (
          <div className="form-row">
            <label>Description</label>
            <input type="text" value={form.description || ''} onChange={e => setField('description', e.target.value)} />
          </div>
        )}
        {formError && <div className="error-msg">{formError}</div>}
        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>
    </>
  )
}
