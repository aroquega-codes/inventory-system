from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Supplier
from schemas import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter()


@router.get("/", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.post("/", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    sup = Supplier(**payload.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup


@router.get("/{sup_id}", response_model=SupplierResponse)
def get_supplier(sup_id: int, db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(404, "Supplier not found")
    return sup


@router.put("/{sup_id}", response_model=SupplierResponse)
def update_supplier(sup_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(404, "Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sup, field, value)
    db.commit()
    db.refresh(sup)
    return sup


@router.delete("/{sup_id}", status_code=204)
def delete_supplier(sup_id: int, db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(404, "Supplier not found")
    db.delete(sup)
    db.commit()
