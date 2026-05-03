/**
 * Route existence tests.
 *
 * Application routes:
 *   /            Dashboard  – inventory summary cards and recent low-stock items
 *   /items       Items      – full item catalog with CRUD (add, edit, deactivate)
 *   /movements   Movements  – stock in/out transaction history and new movement form
 *   /alerts      Alerts     – reorder alerts with acknowledge / order / close workflow
 *   /setup       Setup      – admin panel for categories, suppliers, and locations
 *
 * Unknown paths redirect to /.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

vi.mock('../components/Sidebar', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <nav data-testid="sidebar" data-open={isOpen} />
  ),
}))

vi.mock('../pages/Dashboard', () => ({
  default: () => <main data-testid="page-dashboard">Dashboard</main>,
}))

vi.mock('../pages/Items', () => ({
  default: () => <main data-testid="page-items">Items</main>,
}))

vi.mock('../pages/Movements', () => ({
  default: () => <main data-testid="page-movements">Movements</main>,
}))

vi.mock('../pages/Alerts', () => ({
  default: () => <main data-testid="page-alerts">Alerts</main>,
}))

vi.mock('../pages/Setup', () => ({
  default: () => <main data-testid="page-setup">Setup</main>,
}))

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const routes = [
  {
    path: '/',
    testId: 'page-dashboard',
    description: 'Dashboard – inventory summary and low-stock overview',
  },
  {
    path: '/items',
    testId: 'page-items',
    description: 'Items – catalog with add, edit, and deactivate operations',
  },
  {
    path: '/movements',
    testId: 'page-movements',
    description: 'Movements – stock in/out log and new movement form',
  },
  {
    path: '/alerts',
    testId: 'page-alerts',
    description: 'Alerts – reorder alerts with acknowledge/order/close workflow',
  },
  {
    path: '/setup',
    testId: 'page-setup',
    description: 'Setup – admin panel for categories, suppliers, and locations',
  },
]

describe('Application routes', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024)
  })

  routes.forEach(({ path, testId, description }) => {
    it(`${path} renders ${description}`, () => {
      renderAt(path)
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    })
  })

  it('unknown path redirects to dashboard', () => {
    renderAt('/does-not-exist')
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument()
  })
})

describe('Sidebar drawer behaviour', () => {
  it('starts open on desktop (innerWidth > 768)', () => {
    vi.stubGlobal('innerWidth', 1280)
    renderAt('/')
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true')
  })

  it('starts closed on mobile (innerWidth <= 768)', () => {
    vi.stubGlobal('innerWidth', 375)
    renderAt('/')
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false')
  })

  it('shows a reopen tab on desktop when sidebar is closed', () => {
    vi.stubGlobal('innerWidth', 1280)
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Toggle navigation'))
    expect(screen.getByLabelText('Open navigation')).toBeInTheDocument()
  })

  it('reopen tab restores the sidebar on desktop', () => {
    vi.stubGlobal('innerWidth', 1280)
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Toggle navigation'))
    fireEvent.click(screen.getByLabelText('Open navigation'))
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true')
  })
})
