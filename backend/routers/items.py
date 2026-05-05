from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Criticality, Item, StockMovement
from schemas import ItemCreate, ItemResponse, ItemUpdate

router = APIRouter()


def _qty(db: Session, item_id: int) -> float:
    result = db.query(func.sum(StockMovement.quantity)).filter(StockMovement.item_id == item_id).scalar()
    return float(result or 0)


def _to_response(db: Session, item: Item) -> ItemResponse:
    qty = _qty(db, item.id)
    # Resolve effective lead time: item-level override takes precedence over supplier default
    lead = item.lead_time_days
    if lead is None and item.default_supplier:
        lead = item.default_supplier.lead_time_days
    return ItemResponse(
        id=item.id,
        sku=item.sku,
        name=item.name,
        description=item.description,
        category_id=item.category_id,
        category_name=item.category.name if item.category else None,
        default_supplier_id=item.default_supplier_id,
        supplier_name=item.default_supplier.name if item.default_supplier else None,
        unit_of_measure=item.unit_of_measure,
        unit_cost=item.unit_cost,
        quantity_on_hand=qty,
        reorder_point=item.reorder_point,
        reorder_quantity=item.reorder_quantity,
        lead_time_days=lead,
        criticality=item.criticality.value,
        is_active=item.is_active,
        is_below_reorder=qty < item.reorder_point,
    )


@router.get("/", response_model=list[ItemResponse])
def list_items(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    criticality: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(Item)
    if active_only:
        q = q.filter(Item.is_active == True)
    if category_id:
        q = q.filter(Item.category_id == category_id)
    if criticality:
        q = q.filter(Item.criticality == criticality)
    if search:
        like = f"%{search}%"
        q = q.filter((Item.name.ilike(like)) | (Item.sku.ilike(like)))
    items = q.order_by(Item.name).all()
    return [_to_response(db, item) for item in items]


@router.get("/low-stock", response_model=list[ItemResponse])
def low_stock_items(db: Session = Depends(get_db)):
    """Returns all active items currently below their reorder point."""
    items = db.query(Item).filter(Item.is_active == True).all()
    below = [item for item in items if _qty(db, item.id) < item.reorder_point]
    # Sort: critical first, then important, then standard
    order = {Criticality.critical: 0, Criticality.important: 1, Criticality.standard: 2}
    below.sort(key=lambda i: order.get(i.criticality, 3))
    return [_to_response(db, item) for item in below]


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return _to_response(db, item)


@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    if db.query(Item).filter(Item.sku == payload.sku).first():
        raise HTTPException(400, f"SKU '{payload.sku}' already exists")
    item = Item(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(db, item)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(db, item)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    # Soft-delete: deactivate rather than removing the record (preserves movement history)
    item.is_active = False
    db.commit()
