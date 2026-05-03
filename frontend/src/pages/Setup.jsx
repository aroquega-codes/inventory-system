import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'

const TABS = ['categories', 'suppliers', 'locations']

function tabLabel(t) {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function Setup() {
  const [activeTab, setActiveTab] = useState('categories')
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [modal, setModal] = useState(null) // null | { type, record }
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [cats, sups, locs] = await Promise.all([
      api.get('/categories/'),
      api.get('/suppliers/'),
      api.get('/locations/'),
    ])
    setCategories(cats)
    setSuppliers(sups)
    setLocations(locs)
  }

  function openModal(type, record = null) {
    setFormError('')
    if (type === 'sup') {
      setForm(record
        ? { name: record.name, contact: record.contact || '', lead_time_days: record.lead_time_days }
        : { name: '', contact: '', lead_time_days: 7 })
    } else {
      setForm(record
        ? { name: record.name, description: record.description || '' }
        : { name: '', description: '' })
    }
    setModal({ type, record })
  }

  async function saveModal() {
    setFormError('')
    const { type, record } = modal
    try {
      if (type === 'cat') {
        const body = { name: form.name.trim(), description: form.description.trim() || null }
        if (record) await api.put('/categories/' + record.id, body)
        else await api.post('/categories/', body)
        setCategories(await api.get('/categories/'))
      } else if (type === 'sup') {
        const body = { name: form.name.trim(), contact: form.contact.trim() || null, lead_time_days: parseInt(form.lead_time_days) || 7 }
        if (record) await api.put('/suppliers/' + record.id, body)
        else await api.post('/suppliers/', body)
        setSuppliers(await api.get('/suppliers/'))
      } else {
        const body = { name: form.name.trim(), description: form.description.trim() || null }
        if (record) await api.put('/locations/' + record.id, body)
        else await api.post('/locations/', body)
        setLocations(await api.get('/locations/'))
      }
      setModal(null)
    } catch (e) {
      setFormError(e.message)
    }
  }

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

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

      {modal && (
        <Modal title={modalTitle} onClose={() => setModal(null)}>
          <div className="form-row">
            <label>Name *</label>
            <input type="text" value={form.name || ''} onChange={e => setField('name', e.target.value)} />
          </div>
          {modal.type === 'sup' ? (
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
            <button className="btn btn-primary" onClick={saveModal}>Save</button>
          </div>
        </Modal>
      )}
    </>
  )
}
