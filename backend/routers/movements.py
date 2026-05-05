from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AlertStatus, Criticality, Item, MovementType, ReorderAlert, StockMovement
from schemas import StockMovementCreate, StockMovementResponse

router = APIRouter()


def _current_qty(db: Session, item_id: int) -> float:
    result = db.query(func.sum(StockMovement.quantity)).filter(StockMovement.item_id == item_id).scalar()
    return float(result or 0)


def _to_response(m: StockMovement) -> StockMovementResponse:
    return StockMovementResponse(
        id=m.id,
        item_id=m.item_id,
        item_sku=m.item.sku if m.item else None,
        item_name=m.item.name if m.item else None,
        timestamp=m.timestamp,
        movement_type=m.movement_type.value,
        quantity=m.quantity,
        location_from_id=m.location_from_id,
        location_from_name=m.location_from.name if m.location_from else None,
        location_to_id=m.location_to_id,
        location_to_name=m.location_to.name if m.location_to else None,
        reference=m.reference,
        performed_by=m.performed_by,
        notes=m.notes,
    )


@router.get("/", response_model=list[StockMovementResponse])
def list_movements(
    item_id: Optional[int] = Query(None),
    movement_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(StockMovement)
    if item_id:
        q = q.filter(StockMovement.item_id == item_id)
    if movement_type:
        q = q.filter(StockMovement.movement_type == movement_type)
    movements = q.order_by(StockMovement.timestamp.desc()).limit(limit).all()
    return [_to_response(m) for m in movements]


@router.post("/", response_model=StockMovementResponse, status_code=201)
def create_movement(payload: StockMovementCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    # Adjustments must include a reason
    if payload.movement_type == MovementType.adjustment and not payload.notes:
        raise HTTPException(400, "Adjustment movements require a 'notes' field explaining the reason")

    current_qty = _current_qty(db, item.id)
    new_qty = current_qty + payload.quantity

    # Prevent negative stock
    if new_qty < 0:
        raise HTTPException(
            400,
            f"Movement would result in negative stock. "
            f"Current stock: {current_qty:.0f}, requested change: {payload.quantity:+.0f}"
        )

    m_data = payload.model_dump()
    if m_data.get("timestamp") is None:
        del m_data["timestamp"]

    movement = StockMovement(**m_data)
    db.add(movement)
    db.flush()

    # Auto-generate a reorder alert for critical items falling below threshold
    if new_qty < item.reorder_point and item.criticality == Criticality.critical:
        existing = db.query(ReorderAlert).filter(
            ReorderAlert.item_id == item.id,
            ReorderAlert.status == AlertStatus.open,
        ).first()
        if not existing:
            alert = ReorderAlert(
                item_id=item.id,
                status=AlertStatus.open,
                notes=f"Stock ({new_qty:.0f}) fell below reorder point ({item.reorder_point})",
            )
            db.add(alert)

    db.commit()
    db.refresh(movement)
    return _to_response(movement)
