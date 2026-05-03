import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { CritBadge, fmtDate } from '../utils'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [statusFilter, setStatusFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [alertStatus, setAlertStatus] = useState('')
  const [alertNotes, setAlertNotes] = useState('')

  useEffect(() => {
    loadAlerts()
  }, [statusFilter])

  async function loadAlerts() {
    setLoading(true)
    const url = '/alerts/' + (statusFilter ? '?status=' + statusFilter : '')
    const data = await api.get(url)
    setAlerts(data)
    setLoading(false)
  }

  function openModal(alert) {
    setModal(alert)
    setAlertStatus(alert.status)
    setAlertNotes(alert.notes || '')
  }

  async function saveAlertStatus() {
    await api.patch('/alerts/' + modal.id, {
      status: alertStatus,
      notes: alertNotes.trim() || null,
    })
    setModal(null)
    loadAlerts()
  }

  return (
    <>
      <div className="page-title">Reorder Alerts</div>
      <div className="toolbar">
        <select className="filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="ordered">Ordered</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Criticality</th>
              <th>On Hand</th>
              <th>Reorder Pt.</th>
              <th>Triggered</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="empty-state">Loading…</td></tr>
            ) : alerts.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">No alerts</td></tr>
            ) : alerts.map(a => (
              <tr key={a.id}>
                <td>
                  <span className="mono">{a.item_sku}</span>
                  <br />
                  <span className="tag">{a.item_name}</span>
                </td>
                <td><CritBadge value={a.item_criticality} /></td>
                <td><strong>{a.quantity_on_hand}</strong></td>
                <td>{a.reorder_point}</td>
                <td className="tag">{fmtDate(a.triggered_at)}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => openModal(a)}>Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Update Alert Status" onClose={() => setModal(null)}>
          <div className="form-row">
            <label>New Status</label>
            <select value={alertStatus} onChange={e => setAlertStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="ordered">Ordered</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="form-row">
            <label>Notes</label>
            <textarea value={alertNotes} onChange={e => setAlertNotes(e.target.value)} />
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveAlertStatus}>Save</button>
          </div>
        </Modal>
      )}
    </>
  )
}
