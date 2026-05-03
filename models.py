import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Criticality(str, enum.Enum):
    critical = "critical"
    important = "important"
    standard = "standard"


class MovementType(str, enum.Enum):
    receipt = "receipt"
    issue = "issue"
    transfer = "transfer"
    adjustment = "adjustment"
    initial_stock = "initial_stock"


class AlertStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    ordered = "ordered"
    closed = "closed"


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    items = relationship("Item", back_populates="category")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact = Column(String(200), nullable=True)
    lead_time_days = Column(Integer, nullable=False, default=7)

    items = relationship("Item", back_populates="default_supplier")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    movements_from = relationship("StockMovement", foreign_keys="StockMovement.location_from_id", back_populates="location_from")
    movements_to = relationship("StockMovement", foreign_keys="StockMovement.location_to_id", back_populates="location_to")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    default_supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    unit_of_measure = Column(String(50), nullable=False, default="each")
    unit_cost = Column(Float, nullable=False, default=0.0)
    # quantity_on_hand is always derived from StockMovement — never stored directly
    reorder_point = Column(Integer, nullable=False, default=0)
    reorder_quantity = Column(Integer, nullable=False, default=0)
    lead_time_days = Column(Integer, nullable=True)  # overrides supplier default when set
    criticality = Column(Enum(Criticality), nullable=False, default=Criticality.standard)
    is_active = Column(Boolean, nullable=False, default=True)

    category = relationship("Category", back_populates="items")
    default_supplier = relationship("Supplier", back_populates="items")
    movements = relationship("StockMovement", back_populates="item")
    alerts = relationship("ReorderAlert", back_populates="item")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.now)
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Float, nullable=False)  # positive = stock in, negative = stock out
    location_from_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    location_to_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    reference = Column(String(200), nullable=True)
    performed_by = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)

    item = relationship("Item", back_populates="movements")
    location_from = relationship("Location", foreign_keys=[location_from_id], back_populates="movements_from")
    location_to = relationship("Location", foreign_keys=[location_to_id], back_populates="movements_to")


class ReorderAlert(Base):
    __tablename__ = "reorder_alerts"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    triggered_at = Column(DateTime, nullable=False, default=datetime.now)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.open)
    notes = Column(Text, nullable=True)

    item = relationship("Item", back_populates="alerts")
