from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models import Employee
from database import get_db

router = APIRouter()

@router.get("/")
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(Employee).all()
    
    return {'empleados': employees}