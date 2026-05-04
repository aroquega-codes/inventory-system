import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../api/client'
import Items from '../pages/Items'
import type { Item, Category } from '../types'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('../components/Modal', () => ({
  default: ({ title, open, onClose, children }: {
    title: string; open: boolean; onClose: () => void; children: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal" data-title={title}>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}))

const ITEMS: Item[] = [
  {
    id: 1, sku: 'BRG-001', name: 'Deep Groove Bearing',
    description: '6205 2RS', unit_of_measure: 'each', unit_cost: 25.5,
    criticality: 'critical', reorder_point: 5, reorder_quantity: 10,
    lead_time_days: null, category_id: 1, category_name: 'Bearings',
    default_supplier_id: null, quantity_on_hand: 3, is_below_reorder: true,
  },
  {
    id: 2, sku: 'BOLT-M8', name: 'Hex Bolt M8',
    description: null, unit_of_measure: 'each', unit_cost: 0.5,
    criticality: 'standard', reorder_point: 100, reorder_quantity: 500,
    lead_time_days: 7, category_id: null, category_name: null,
    default_supplier_id: null, quantity_on_hand: 200, is_below_reorder: false,
  },
]

const CATEGORIES: Category[] = [{ id: 1, name: 'Bearings', description: null }]

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Items />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/items/') return Promise.resolve(ITEMS) as any
    if (path === '/categories/') return Promise.resolve(CATEGORIES) as any
    if (path === '/suppliers/') return Promise.resolve([]) as any
    if (/^\/items\/\d+$/.test(path)) return Promise.resolve(ITEMS[0]) as any
    return Promise.reject(new Error('Unmocked path: ' + path))
  })
})

describe('Items page – desktop (innerWidth 1280)', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1280)
  })

  it('shows a loading state initially', () => {
    setup()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the page title after data loads', async () => {
    setup()
    expect(await screen.findByText('Items')).toBeInTheDocument()
  })

  it('displays items in the table after data loads', async () => {
    setup()
    expect(await screen.findByTestId('items-table')).toBeInTheDocument()
    expect(screen.getByText('Deep Groove Bearing')).toBeInTheDocument()
    expect(screen.getByText('Hex Bolt M8')).toBeInTheDocument()
  })

  it('displays SKUs in the table', async () => {
    setup()
    await screen.findByTestId('items-table')
    expect(screen.getByText('BRG-001')).toBeInTheDocument()
    expect(screen.getByText('BOLT-M8')).toBeInTheDocument()
  })

  describe('filtering', () => {
    it('filters items by name', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByPlaceholderText('Search by name or SKU…'), {
        target: { value: 'bolt' },
      })
      expect(screen.queryByText('Deep Groove Bearing')).not.toBeInTheDocument()
      expect(screen.getByText('Hex Bolt M8')).toBeInTheDocument()
    })

    it('filters items by SKU', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByPlaceholderText('Search by name or SKU…'), {
        target: { value: 'BRG' },
      })
      expect(screen.getByText('Deep Groove Bearing')).toBeInTheDocument()
      expect(screen.queryByText('Hex Bolt M8')).not.toBeInTheDocument()
    })

    it('filters by category', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByDisplayValue('All Categories'), {
        target: { value: '1' },
      })
      expect(screen.getByText('Deep Groove Bearing')).toBeInTheDocument()
      expect(screen.queryByText('Hex Bolt M8')).not.toBeInTheDocument()
    })

    it('filters by criticality', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByDisplayValue('All Criticality'), {
        target: { value: 'standard' },
      })
      expect(screen.queryByText('Deep Groove Bearing')).not.toBeInTheDocument()
      expect(screen.getByText('Hex Bolt M8')).toBeInTheDocument()
    })

    it('shows empty state when nothing matches the search', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByPlaceholderText('Search by name or SKU…'), {
        target: { value: 'xyznonexistent' },
      })
      expect(screen.getByText('No items found')).toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('defaults to Name A→Z order', async () => {
      setup()
      await screen.findByTestId('items-table')
      expect((screen.getByDisplayValue('Name A→Z') as HTMLSelectElement).value).toBe('name:asc')
    })

    it('sorts Name Z→A correctly', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByDisplayValue('Name A→Z'), { target: { value: 'name:desc' } })
      const rows = screen.getAllByTestId(/^item-row-/)
      expect(rows[0]).toHaveAttribute('data-testid', 'item-row-2') // Hex Bolt M8 > Deep Groove
    })

    it('sorts Newest First (id desc)', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByDisplayValue('Name A→Z'), { target: { value: 'id:desc' } })
      const rows = screen.getAllByTestId(/^item-row-/)
      expect(rows[0]).toHaveAttribute('data-testid', 'item-row-2') // id 2 > id 1
    })

    it('sorts Oldest First (id asc)', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.change(screen.getByDisplayValue('Name A→Z'), { target: { value: 'id:asc' } })
      const rows = screen.getAllByTestId(/^item-row-/)
      expect(rows[0]).toHaveAttribute('data-testid', 'item-row-1') // id 1 first
    })
  })

  describe('New Item modal', () => {
    it('opens the modal when + New Item is clicked', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getByText('+ New Item'))
      expect(screen.getByTestId('modal')).toHaveAttribute('data-title', 'New Item')
    })

    it('closes the modal when Cancel is clicked', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getByText('+ New Item'))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('pre-fills default values in the new-item form', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getByText('+ New Item'))
      expect((screen.getByLabelText('SKU *') as HTMLInputElement).value).toBe('')
      expect((screen.getByLabelText('Unit of Measure *') as HTMLInputElement).value).toBe('each')
    })

    it('calls POST /items/ with the correct payload', async () => {
      vi.mocked(api.post).mockResolvedValue({ id: 3, ...ITEMS[0], sku: 'NEW-001', name: 'New Part' } as any)
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getByText('+ New Item'))

      fireEvent.change(screen.getByLabelText('SKU *'), { target: { value: 'NEW-001' } })
      fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'New Part' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          '/items/',
          expect.objectContaining({ sku: 'NEW-001', name: 'New Part' })
        )
      )
    })

    it('shows an error message when POST fails', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('SKU already exists'))
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getByText('+ New Item'))
      fireEvent.change(screen.getByLabelText('SKU *'), { target: { value: 'DUP-001' } })
      fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Duplicate' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('SKU already exists')).toBeInTheDocument()
    })
  })

  describe('Edit Item modal', () => {
    it('opens edit modal when Edit is clicked', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
      await waitFor(() =>
        expect(screen.getByTestId('modal')).toHaveAttribute('data-title', 'Edit Item')
      )
    })

    it('pre-fills the form with the selected item data', async () => {
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
      await waitFor(() =>
        expect((screen.getByLabelText('SKU *') as HTMLInputElement).value).toBe('BRG-001')
      )
      expect((screen.getByLabelText('Name *') as HTMLInputElement).value).toBe('Deep Groove Bearing')
    })

    it('calls PUT /items/:id with updated payload', async () => {
      vi.mocked(api.put).mockResolvedValue({ ...ITEMS[0], name: 'Updated Bearing' } as any)
      setup()
      await screen.findByTestId('items-table')
      fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
      await waitFor(() =>
        expect((screen.getByLabelText('SKU *') as HTMLInputElement).value).toBe('BRG-001')
      )

      fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Updated Bearing' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(vi.mocked(api.put)).toHaveBeenCalledWith(
          '/items/1',
          expect.objectContaining({ name: 'Updated Bearing' })
        )
      )
    })
  })
})

describe('Items page – mobile (innerWidth 375)', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 375)
  })

  it('renders item cards instead of a table', async () => {
    setup()
    expect(await screen.findByTestId('items-cards')).toBeInTheDocument()
    expect(screen.queryByTestId('items-table')).not.toBeInTheDocument()
  })

  it('shows item name and SKU in each card', async () => {
    setup()
    await screen.findByTestId('items-cards')
    expect(screen.getByText('Deep Groove Bearing')).toBeInTheDocument()
    expect(screen.getByText('BRG-001')).toBeInTheDocument()
  })

  it('shows criticality badge in each card', async () => {
    setup()
    await screen.findByTestId('items-cards')
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('standard')).toBeInTheDocument()
  })

  it('opens edit modal from card Edit button', async () => {
    setup()
    await screen.findByTestId('items-cards')
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await waitFor(() =>
      expect(screen.getByTestId('modal')).toHaveAttribute('data-title', 'Edit Item')
    )
  })

  it('opens new item modal via the FAB button', async () => {
    setup()
    await screen.findByTestId('items-cards')
    fireEvent.click(screen.getByRole('button', { name: 'New Item' }))
    expect(screen.getByTestId('modal')).toHaveAttribute('data-title', 'New Item')
  })

  it('shows empty state when search matches nothing', async () => {
    setup()
    await screen.findByTestId('items-cards')
    fireEvent.change(screen.getByPlaceholderText('Search by name or SKU…'), {
      target: { value: 'xyznonexistent' },
    })
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })
})
