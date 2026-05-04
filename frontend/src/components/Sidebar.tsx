import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
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
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/items', icon: Package, label: 'Items' },
      { to: '/movements', icon: ArrowLeftRight, label: 'Movements' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/setup', icon: Settings, label: 'Setup' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
          <button className="sidebar-toggle" onClick={onToggle} aria-label="Collapse sidebar">
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {sections.map(section => (
          <div key={section.label}>
            <div className="nav-section">{section.label}</div>
            {section.items.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={handleNavClick}
                >
                  <span className="icon"><Icon size={18} /></span>
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </nav>
  )
}
