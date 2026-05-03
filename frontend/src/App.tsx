import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Movements from './pages/Movements'
import Alerts from './pages/Alerts'
import Setup from './pages/Setup'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)

  function toggle() { setSidebarOpen(o => !o) }
  function close() { setSidebarOpen(false) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggle} onClose={close} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={close} />}
      {!sidebarOpen && (
        <button className="sidebar-reopen-btn" onClick={toggle} aria-label="Open navigation">
          ›
        </button>
      )}
      <div id="content-area" className={sidebarOpen ? '' : 'sidebar-closed'}>
        <header id="topbar">
          <button className="hamburger" onClick={toggle} aria-label="Toggle navigation">
            ☰
          </button>
          <span className="topbar-brand">TAMBO IMS</span>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/items" element={<Items />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
