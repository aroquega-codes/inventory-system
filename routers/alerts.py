from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import AlertStatus, ReorderAlert, StockMovement
from schemas import ReorderAlertResponse, ReorderAlertUpdate

router = APIRouter()


def _qty(db: Session, item_id: int) -> float:
    result = db.query(func.sum(StockMovement.quantity)).filter(StockMovement.item_id == item_id).scalar()
    return float(result or 0)


def _to_response(db: Session, alert: ReorderAlert) -> ReorderAlertResponse:
    item = alert.item
    return ReorderAlertResponse(
        id=alert.id,
        item_id=alert.item_id,
        item_sku=item.sku if item else None,
        item_name=item.name if item else None,
        item_criticality=item.criticality.value if item else None,
        quantity_on_hand=_qty(db, alert.item_id),
        reorder_point=item.reorder_point if item else None,
        triggered_at=alert.triggered_at,
        status=alert.status.value,
        notes=alert.notes,
    )


@router.get("/", response_model=list[ReorderAlertResponse])
def list_alerts(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ReorderAlert)
    if status:
        q = q.filter(ReorderAlert.status == status)
    alerts = q.order_by(ReorderAlert.triggered_at.desc()).all()
    return [_to_response(db, a) for a in alerts]


@router.patch("/{alert_id}", response_model=ReorderAlertResponse)
def update_alert(alert_id: int, payload: ReorderAlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(ReorderAlert).filter(ReorderAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.status = payload.status
    if payload.notes is not None:
        alert.notes = payload.notes
    db.commit()
    db.refresh(alert)
    return _to_response(db, alert)
