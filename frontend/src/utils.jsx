export function CritBadge({ value }) {
  return <span className={`badge badge-${value}`}>{value}</span>
}

export function StockDot({ item }) {
  if (item.is_below_reorder) {
    const ratio = item.quantity_on_hand / item.reorder_point
    return <span className={`stock-dot ${ratio <= 0.5 ? 'dot-red' : 'dot-amber'}`} />
  }
  return <span className="stock-dot dot-green" />
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function currency(v) {
  return 'S/. ' + Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
