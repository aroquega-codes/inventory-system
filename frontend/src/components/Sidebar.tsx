import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  icon: string
  label: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { to: '/', icon: '📊', label: 'Dashboard' },
      { to: '/items', icon: '📦', label: 'Items' },
      { to: '/movements', icon: '🔄', label: 'Movements' },
      { to: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/setup', icon: '⚙️', label: 'Setup' },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export default function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  function handleNavClick() {
    if (window.innerWidth <= 768) onClose()
  }

  return (
    <nav id="sidebar" className={isOpen ? 'open' : 'closed'}>
      <div className="logo">
        <div>
          TAMBO IMS
          <small>Industrial Inventory</small>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Collapse sidebar">
          {isOpen ? '‹' : '›'}
        </button>
      </div>
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {sections.map(section => (
          <div key={section.label}>
            <div className="nav-section">{section.label}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </nav>
  )
}
