from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AlertStatus, Criticality, Item, MovementType, ReorderAlert, StockMovement
from schemas import ActivityMetrics, DashboardSummary, LowStockItem

router = APIRouter()


def _qty(db: Session, item_id: int) -> float:
    result = db.query(func.sum(StockMovement.quantity)).filter(StockMovement.item_id == item_id).scalar()
    return float(result or 0)


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(period: int = Query(7, ge=7, le=30), db: Session = Depends(get_db)):
    active_items = db.query(Item).filter(Item.is_active == True).all()

    total_value = 0.0
    below_reorder: list[Item] = []

    for item in active_items:
        qty = _qty(db, item.id)
        total_value += qty * item.unit_cost
        if qty < item.reorder_point:
            below_reorder.append(item)

    open_alerts = db.query(ReorderAlert).filter(ReorderAlert.status == AlertStatus.open).count()

    n = len(active_items)
    stock_health_pct = round((n - len(below_reorder)) / n * 100, 1) if n else 100.0

    # Activity metrics for the selected period
    since = datetime.now() - timedelta(days=period)

    movements_total = db.query(StockMovement).filter(StockMovement.timestamp >= since).count()

    receipts = db.query(StockMovement).filter(
        StockMovement.timestamp >= since,
        StockMovement.movement_type.in_([MovementType.receipt, MovementType.initial_stock]),
    ).count()

    issues = db.query(StockMovement).filter(
        StockMovement.timestamp >= since,
        StockMovement.movement_type == MovementType.issue,
    ).count()

    alerts_opened = db.query(ReorderAlert).filter(ReorderAlert.triggered_at >= since).count()

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
        stock_health_pct=stock_health_pct,
        total_inventory_value=round(total_value, 2),
        open_alerts=open_alerts,
        low_stock_items=low_stock_items,
        activity=ActivityMetrics(
            period_days=period,
            movements_total=movements_total,
            receipts=receipts,
            issues=issues,
            alerts_opened=alerts_opened,
        ),
    )
