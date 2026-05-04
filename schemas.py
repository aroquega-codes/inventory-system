from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models import AlertStatus, Criticality, MovementType


# ─── Category ───────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ─── Supplier ────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    lead_time_days: int = 7


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    lead_time_days: Optional[int] = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    contact: Optional[str] = None
    lead_time_days: int
    model_config = ConfigDict(from_attributes=True)


# ─── Location ────────────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    description: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ─── Item ─────────────────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    default_supplier_id: Optional[int] = None
    unit_of_measure: str = "each"
    unit_cost: float = 0.0
    reorder_point: int = 0
    reorder_quantity: int = 0
    lead_time_days: Optional[int] = None
    criticality: Criticality = Criticality.standard
    is_active: bool = True


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    default_supplier_id: Optional[int] = None
    unit_of_measure: Optional[str] = None
    unit_cost: Optional[float] = None
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None
    lead_time_days: Optional[int] = None
    criticality: Optional[Criticality] = None
    is_active: Optional[bool] = None


class ItemResponse(BaseModel):
    id: int
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    default_supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    unit_of_measure: str
    unit_cost: float
    quantity_on_hand: float
    reorder_point: int
    reorder_quantity: int
    lead_time_days: Optional[int] = None
    criticality: str
    is_active: bool
    is_below_reorder: bool


# ─── StockMovement ────────────────────────────────────────────────────────────

class StockMovementCreate(BaseModel):
    item_id: int
    movement_type: MovementType
    quantity: float
    location_from_id: Optional[int] = None
    location_to_id: Optional[int] = None
    reference: Optional[str] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None


class StockMovementResponse(BaseModel):
    id: int
    item_id: int
    item_sku: Optional[str] = None
    item_name: Optional[str] = None
    timestamp: datetime
    movement_type: str
    quantity: float
    location_from_id: Optional[int] = None
    location_from_name: Optional[str] = None
    location_to_id: Optional[int] = None
    location_to_name: Optional[str] = None
    reference: Optional[str] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None


# ─── ReorderAlert ─────────────────────────────────────────────────────────────

class ReorderAlertUpdate(BaseModel):
    status: AlertStatus
    notes: Optional[str] = None


class ReorderAlertResponse(BaseModel):
    id: int
    item_id: int
    item_sku: Optional[str] = None
    item_name: Optional[str] = None
    item_criticality: Optional[str] = None
    quantity_on_hand: Optional[float] = None
    reorder_point: Optional[int] = None
    triggered_at: datetime
    status: str
    notes: Optional[str] = None


# ─── Dashboard ────────────────────────────────────────────────────────────────

class LowStockItem(BaseModel):
    id: int
    sku: str
    name: str
    criticality: str
    quantity_on_hand: float
    reorder_point: int
    supplier_name: Optional[str] = None
    lead_time_days: Optional[int] = None


class ActivityMetrics(BaseModel):
    period_days: int
    movements_total: int
    receipts: int
    issues: int
    alerts_opened: int


class DashboardSummary(BaseModel):
    total_skus: int
    active_items: int
    items_below_reorder: int
    stock_health_pct: float
    total_inventory_value: float
    open_alerts: int
    low_stock_items: list[LowStockItem]
    activity: ActivityMetrics
