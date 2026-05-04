export type Criticality = 'critical' | 'important' | 'standard'
export type AlertStatus = 'open' | 'acknowledged' | 'ordered' | 'closed'
export type MovementType = 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'initial_stock'

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface Supplier {
  id: number
  name: string
  contact: string | null
  lead_time_days: number
}

export interface Location {
  id: number
  name: string
  description: string | null
}

export interface Item {
  id: number
  sku: string
  name: string
  description: string | null
  unit_of_measure: string
  unit_cost: number
  criticality: Criticality
  reorder_point: number
  reorder_quantity: number
  lead_time_days: number | null
  category_id: number | null
  category_name: string | null
  default_supplier_id: number | null
  quantity_on_hand: number
  is_below_reorder: boolean
}

export interface LowStockItem {
  id: number
  sku: string
  name: string
  criticality: Criticality
  quantity_on_hand: number
  reorder_point: number
  supplier_name: string | null
  lead_time_days: number | null
}

export interface ActivityMetrics {
  period_days: number
  movements_total: number
  receipts: number
  issues: number
  alerts_opened: number
}

export interface DashboardSummary {
  total_skus: number
  active_items: number
  items_below_reorder: number
  stock_health_pct: number
  open_alerts: number
  total_inventory_value: number
  low_stock_items: LowStockItem[]
  activity: ActivityMetrics
}

export interface Movement {
  id: number
  item_id: number
  item_sku: string
  item_name: string
  movement_type: MovementType
  quantity: number
  location_from_id: number | null
  location_to_id: number | null
  reference: string | null
  performed_by: string | null
  notes: string | null
  timestamp: string
}

export interface Alert {
  id: number
  item_sku: string
  item_name: string
  item_criticality: Criticality
  quantity_on_hand: number
  reorder_point: number
  triggered_at: string
  status: AlertStatus
  notes: string | null
}
