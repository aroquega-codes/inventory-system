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

export default function Sidebar() {
  return (
    <nav id="sidebar">
      <div className="logo">
        TAMBO IMS
        <small>Industrial Inventory</small>
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
