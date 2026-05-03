from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AlertStatus, Criticality, Item, ReorderAlert, StockMovement
from schemas import DashboardSummary, LowStockItem

router = APIRouter()


def _qty(db: Session, item_id: int) -> float:
    result = db.query(func.sum(StockMovement.quantity)).filter(StockMovement.item_id == item_id).scalar()
    return float(result or 0)


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    active_items = db.query(Item).filter(Item.is_active == True).all()

    total_value = 0.0
    below_reorder: list[Item] = []

    for item in active_items:
        qty = _qty(db, item.id)
        total_value += qty * item.unit_cost
        if qty < item.reorder_point:
            below_reorder.append(item)

    open_alerts = db.query(ReorderAlert).filter(ReorderAlert.status == AlertStatus.open).count()

    # Top 5 low-stock items sorted by criticality then how far below threshold
    order = {Criticality.critical: 0, Criticality.important: 1, Criticality.standard: 2}
    below_reorder.sort(key=lambda i: (order.get(i.criticality, 3), _qty(db, i.id) - i.reorder_point))

    low_stock_items = []
    for item in below_reorder[:5]:
        qty = _qty(db, item.id)
        lead = item.lead_time_days
        if lead is None and item.default_supplier:
            lead = item.default_supplier.lead_time_days
        low_stock_items.append(LowStockItem(
            id=item.id,
            sku=item.sku,
            name=item.name,
            criticality=item.criticality.value,
            quantity_on_hand=qty,
            reorder_point=item.reorder_point,
            supplier_name=item.default_supplier.name if item.default_supplier else None,
            lead_time_days=lead,
        ))

    return DashboardSummary(
        total_skus=len(active_items),
        active_items=len(active_items),
        items_below_reorder=len(below_reorder),
        total_inventory_value=round(total_value, 2),
        open_alerts=open_alerts,
        low_stock_items=low_stock_items,
    )
