import type { Criticality, Item } from './types'

interface CritBadgeProps {
  value: Criticality
}

export function CritBadge({ value }: CritBadgeProps) {
  return <span className={`badge badge-${value}`}>{value}</span>
}

type StockDotItem = Pick<Item, 'is_below_reorder' | 'quantity_on_hand' | 'reorder_point'>

interface StockDotProps {
  item: StockDotItem
}

export function StockDot({ item }: StockDotProps) {
  if (item.is_below_reorder) {
    const ratio = item.quantity_on_hand / item.reorder_point
    return <span className={`stock-dot ${ratio <= 0.5 ? 'dot-red' : 'dot-amber'}`} />
  }
  return <span className="stock-dot dot-green" />
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function currency(v: number | string): string {
  return 'S/. ' + Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
