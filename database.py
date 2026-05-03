from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from models import (
    AlertStatus, Base, Category, Criticality, Item, Location,
    MovementType, ReorderAlert, StockMovement, Supplier,
)

DATABASE_URL = "sqlite:///./inventory.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


def seed_db():
    db: Session = SessionLocal()

    if db.query(Category).first():
        db.close()
        return

    # ── Categories ──────────────────────────────────────────────────────────
    cats = [
        Category(name="Electrical",   description="Electrical components, cables, switchgear"),
        Category(name="Mechanical",   description="Bearings, belts, shafts, mechanical assemblies"),
        Category(name="Hydraulics",   description="Hydraulic cylinders, seals, hoses, fluids"),
        Category(name="Safety",       description="PPE and safety equipment"),
        Category(name="Consumables",  description="Lubricants, oils, and regularly consumed materials"),
    ]
    for c in cats:
        db.add(c)
    db.flush()
    cat = {c.name: c.id for c in cats}

    # ── Suppliers ────────────────────────────────────────────────────────────
    sups = [
        Supplier(name="Distribuidora Local SAC",         contact="ventas@local.pe",          lead_time_days=1),
        Supplier(name="Proveedores Industriales Lima",   contact="pedidos@pil.pe",           lead_time_days=5),
        Supplier(name="Importaciones Industriales Peru", contact="importaciones@iip.pe",     lead_time_days=15),
    ]
    for s in sups:
        db.add(s)
    db.flush()
    sup = {s.name: s.id for s in sups}

    # ── Locations ────────────────────────────────────────────────────────────
    locs = [
        Location(name="Main Warehouse",     description="Primary bulk storage facility"),
        Location(name="Workshop Storeroom", description="Parts stored adjacent to maintenance workshop"),
        Location(name="Emergency Cabinet",  description="Critical spares for immediate breakdown response"),
        Location(name="Receiving Area",     description="Incoming goods inspection and staging"),
    ]
    for l in locs:
        db.add(l)
    db.flush()
    loc = {l.name: l.id for l in locs}

    # ── Items (20) ────────────────────────────────────────────────────────────
    LOCAL  = sup["Distribuidora Local SAC"]
    LIMA   = sup["Proveedores Industriales Lima"]
    IMPORT = sup["Importaciones Industriales Peru"]

    items_data = [
        # Mechanical
        dict(sku="BRG-SKF-6205",    name="Bearing SKF 6205",            description="Deep groove ball bearing 25x52x15mm",
             category_id=cat["Mechanical"],   default_supplier_id=LIMA,   unit_of_measure="each",  unit_cost=45.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.critical),
        dict(sku="BRG-SKF-6305",    name="Bearing SKF 6305",            description="Deep groove ball bearing 25x62x17mm",
             category_id=cat["Mechanical"],   default_supplier_id=LIMA,   unit_of_measure="each",  unit_cost=55.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.critical),
        dict(sku="BLT-VBELT-B68",   name="V-belt B68",                  description="Classic V-belt section B, 68 inches",
             category_id=cat["Mechanical"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=25.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.important),
        dict(sku="BLT-VBELT-C75",   name="V-belt C75",                  description="Classic V-belt section C, 75 inches",
             category_id=cat["Mechanical"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=30.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.important),
        dict(sku="MEC-PGAUGE-16BAR", name="Pressure Gauge 0-16 bar",   description="Glycerin-filled gauge, 1/4\" BSP connection",
             category_id=cat["Mechanical"],   default_supplier_id=LIMA,   unit_of_measure="each",  unit_cost=65.00,  reorder_point=2,  reorder_quantity=4,  criticality=Criticality.important),
        # Hydraulics
        dict(sku="HYD-SEAL-50MM",   name="Hydraulic Seal Kit 50mm",     description="Complete seal kit for 50mm bore hydraulic cylinder",
             category_id=cat["Hydraulics"],   default_supplier_id=IMPORT, unit_of_measure="each",  unit_cost=120.00, reorder_point=3,  reorder_quantity=6,  criticality=Criticality.critical),
        dict(sku="HYD-SEAL-80MM",   name="Hydraulic Seal Kit 80mm",     description="Complete seal kit for 80mm bore hydraulic cylinder",
             category_id=cat["Hydraulics"],   default_supplier_id=IMPORT, unit_of_measure="each",  unit_cost=150.00, reorder_point=3,  reorder_quantity=6,  criticality=Criticality.critical),
        dict(sku="HYD-ORING-50X35", name="O-ring 50x3.5mm",             description="Nitrile O-ring, 50mm ID x 3.5mm cross-section",
             category_id=cat["Hydraulics"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=3.50,   reorder_point=20, reorder_quantity=50, criticality=Criticality.important),
        # Electrical
        dict(sku="ELC-CGLAND-M20",  name="Cable Gland M20",             description="IP68 cable gland M20, suits 6-12mm cables",
             category_id=cat["Electrical"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=8.50,   reorder_point=10, reorder_quantity=20, criticality=Criticality.standard),
        dict(sku="ELC-CGLAND-M25",  name="Cable Gland M25",             description="IP68 cable gland M25, suits 10-16mm cables",
             category_id=cat["Electrical"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=10.00,  reorder_point=10, reorder_quantity=20, criticality=Criticality.standard),
        dict(sku="ELC-FUSE-63A",    name="Fuse 63A gG",                 description="Industrial cartridge fuse 63A 500V gG type",
             category_id=cat["Electrical"],   default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=15.00,  reorder_point=10, reorder_quantity=20, criticality=Criticality.critical),
        dict(sku="ELC-CONT-LC1D25", name="Contactor Schneider LC1D25",  description="3-phase contactor 25A, 220VAC coil",
             category_id=cat["Electrical"],   default_supplier_id=IMPORT, unit_of_measure="each",  unit_cost=180.00, reorder_point=2,  reorder_quantity=4,  criticality=Criticality.important),
        dict(sku="ELC-ESTOP-40MM",  name="Emergency Stop Button 40mm",  description="Latching mushroom-head e-stop 40mm, 1NO+1NC",
             category_id=cat["Electrical"],   default_supplier_id=IMPORT, unit_of_measure="each",  unit_cost=45.00,  reorder_point=3,  reorder_quantity=6,  criticality=Criticality.critical),
        # Safety
        dict(sku="SAF-HHAT-CLASE-E", name="Hard Hat Class E",           description="Dielectric hard hat Class E, yellow, ratchet suspension",
             category_id=cat["Safety"],       default_supplier_id=LIMA,   unit_of_measure="each",  unit_cost=35.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.important),
        dict(sku="SAF-GLASSES-CLEAR", name="Safety Glasses Clear",      description="ANSI Z87.1 clear polycarbonate safety glasses",
             category_id=cat["Safety"],       default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=12.00,  reorder_point=10, reorder_quantity=20, criticality=Criticality.standard),
        dict(sku="SAF-GLOVES-L",    name="Safety Gloves Size L",        description="Cut-resistant work gloves, ANSI A4, size L",
             category_id=cat["Safety"],       default_supplier_id=LOCAL,  unit_of_measure="pair",  unit_cost=8.00,   reorder_point=10, reorder_quantity=20, criticality=Criticality.standard),
        # Consumables
        dict(sku="CON-OIL-15W40-20L", name="Engine Oil 15W40 20L",     description="Mineral engine oil SAE 15W40, 20-litre drum",
             category_id=cat["Consumables"],  default_supplier_id=LOCAL,  unit_of_measure="drum",  unit_cost=85.00,  reorder_point=3,  reorder_quantity=5,  criticality=Criticality.standard),
        dict(sku="HYD-OIL-ISO46-20L", name="Hydraulic Oil ISO VG46 20L", description="ISO VG 46 anti-wear hydraulic oil, 20-litre drum",
             category_id=cat["Consumables"],  default_supplier_id=LIMA,   unit_of_measure="drum",  unit_cost=95.00,  reorder_point=3,  reorder_quantity=5,  criticality=Criticality.important),
        dict(sku="CON-GREASE-400G", name="Grease Cartridge 400g",       description="NLGI 2 lithium complex grease, 400g cartridge",
             category_id=cat["Consumables"],  default_supplier_id=LOCAL,  unit_of_measure="each",  unit_cost=18.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.standard),
        dict(sku="CON-CHAINOIL-1L", name="Chain Lube Oil 1L",           description="Chain and open-gear lubricant, 1-litre spray",
             category_id=cat["Consumables"],  default_supplier_id=LOCAL,  unit_of_measure="litre", unit_cost=22.00,  reorder_point=5,  reorder_quantity=10, criticality=Criticality.standard),
    ]

    item_objs: list[Item] = []
    for data in items_data:
        item = Item(**data)
        db.add(item)
        item_objs.append(item)
    db.flush()
    items = {item.sku: item for item in item_objs}

    # ── Stock Movements (51) ──────────────────────────────────────────────────
    # Final stock levels designed so that two critical items end up below reorder point:
    #   BRG-SKF-6205  → 10 - 3 - 5 = 2  (reorder 5, critical → ALERT)
    #   ELC-FUSE-63A  → 20 - 8 - 7 = 5  (reorder 10, critical → ALERT)
    # Two important items also below reorder:
    #   BLT-VBELT-B68  → 8 - 3 + 5 - 7 = 3  (reorder 5, important)
    #   HYD-ORING-50X35 → 50 - 15 - 20 = 15 (reorder 20, important)

    now = datetime.now()

    def ago(days: int) -> datetime:
        return now - timedelta(days=days)

    WH  = loc["Main Warehouse"]
    WS  = loc["Workshop Storeroom"]
    EC  = loc["Emergency Cabinet"]
    RA  = loc["Receiving Area"]

    movements_data = [
        # ── Initial stock counts (day 90) ───────────────────────────────────
        dict(item_id=items["BRG-SKF-6205"].id,    movement_type=MovementType.initial_stock, quantity=10,  location_to_id=WH, reference="INIT-001", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["BRG-SKF-6305"].id,    movement_type=MovementType.initial_stock, quantity=8,   location_to_id=WH, reference="INIT-002", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["BLT-VBELT-B68"].id,   movement_type=MovementType.initial_stock, quantity=8,   location_to_id=WH, reference="INIT-003", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["BLT-VBELT-C75"].id,   movement_type=MovementType.initial_stock, quantity=8,   location_to_id=WH, reference="INIT-004", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["MEC-PGAUGE-16BAR"].id, movement_type=MovementType.initial_stock, quantity=3,  location_to_id=WH, reference="INIT-005", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["HYD-SEAL-50MM"].id,   movement_type=MovementType.initial_stock, quantity=5,   location_to_id=EC, reference="INIT-006", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["HYD-SEAL-80MM"].id,   movement_type=MovementType.initial_stock, quantity=5,   location_to_id=EC, reference="INIT-007", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["HYD-ORING-50X35"].id, movement_type=MovementType.initial_stock, quantity=50,  location_to_id=WS, reference="INIT-008", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["ELC-CGLAND-M20"].id,  movement_type=MovementType.initial_stock, quantity=25,  location_to_id=WH, reference="INIT-009", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["ELC-CGLAND-M25"].id,  movement_type=MovementType.initial_stock, quantity=15,  location_to_id=WH, reference="INIT-010", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["ELC-FUSE-63A"].id,    movement_type=MovementType.initial_stock, quantity=20,  location_to_id=EC, reference="INIT-011", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["ELC-CONT-LC1D25"].id, movement_type=MovementType.initial_stock, quantity=3,   location_to_id=WH, reference="INIT-012", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["ELC-ESTOP-40MM"].id,  movement_type=MovementType.initial_stock, quantity=5,   location_to_id=EC, reference="INIT-013", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["SAF-HHAT-CLASE-E"].id, movement_type=MovementType.initial_stock, quantity=8,  location_to_id=WH, reference="INIT-014", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["SAF-GLASSES-CLEAR"].id, movement_type=MovementType.initial_stock, quantity=20, location_to_id=WH, reference="INIT-015", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["SAF-GLOVES-L"].id,    movement_type=MovementType.initial_stock, quantity=20,  location_to_id=WH, reference="INIT-016", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["CON-OIL-15W40-20L"].id, movement_type=MovementType.initial_stock, quantity=8, location_to_id=WS, reference="INIT-017", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["HYD-OIL-ISO46-20L"].id, movement_type=MovementType.initial_stock, quantity=5, location_to_id=WS, reference="INIT-018", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["CON-GREASE-400G"].id, movement_type=MovementType.initial_stock, quantity=10,  location_to_id=WS, reference="INIT-019", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),
        dict(item_id=items["CON-CHAINOIL-1L"].id, movement_type=MovementType.initial_stock, quantity=10,  location_to_id=WS, reference="INIT-020", performed_by="Almacenero", notes="Opening stock count", timestamp=ago(90)),

        # ── BRG-SKF-6205: 10 - 3 - 5 = 2 (BELOW reorder 5, critical) ───────
        dict(item_id=items["BRG-SKF-6205"].id, movement_type=MovementType.issue, quantity=-3, location_from_id=WH, reference="WO-2026-0187", performed_by="Técnico Martínez", timestamp=ago(60)),
        dict(item_id=items["BRG-SKF-6205"].id, movement_type=MovementType.issue, quantity=-5, location_from_id=WH, reference="WO-2026-0234", performed_by="Técnico López",    timestamp=ago(15)),

        # ── ELC-FUSE-63A: 20 - 8 - 7 = 5 (BELOW reorder 10, critical) ──────
        dict(item_id=items["ELC-FUSE-63A"].id, movement_type=MovementType.issue, quantity=-8, location_from_id=EC, reference="WO-2026-0145", performed_by="Electricista Ramos", timestamp=ago(70)),
        dict(item_id=items["ELC-FUSE-63A"].id, movement_type=MovementType.issue, quantity=-7, location_from_id=EC, reference="WO-2026-0198", performed_by="Electricista Ramos", timestamp=ago(28)),

        # ── BLT-VBELT-B68: 8 - 3 + 5 - 7 = 3 (BELOW reorder 5, important) ─
        dict(item_id=items["BLT-VBELT-B68"].id, movement_type=MovementType.issue,   quantity=-3, location_from_id=WH, reference="WO-2026-0112", performed_by="Técnico García",  timestamp=ago(80)),
        dict(item_id=items["BLT-VBELT-B68"].id, movement_type=MovementType.receipt, quantity=5,  location_to_id=RA,   reference="PO-2026-0045", performed_by="Almacenero",      timestamp=ago(50)),
        dict(item_id=items["BLT-VBELT-B68"].id, movement_type=MovementType.issue,   quantity=-7, location_from_id=WH, reference="WO-2026-0221", performed_by="Técnico García",  timestamp=ago(12)),

        # ── HYD-ORING-50X35: 50 - 15 - 20 = 15 (BELOW reorder 20, important)
        dict(item_id=items["HYD-ORING-50X35"].id, movement_type=MovementType.issue, quantity=-15, location_from_id=WS, reference="WO-2026-0098", performed_by="Hidráulico Quispe", timestamp=ago(75)),
        dict(item_id=items["HYD-ORING-50X35"].id, movement_type=MovementType.issue, quantity=-20, location_from_id=WS, reference="WO-2026-0189", performed_by="Hidráulico Quispe", timestamp=ago(22)),

        # ── HYD-SEAL-50MM: 5 + 5 = 10 ──────────────────────────────────────
        dict(item_id=items["HYD-SEAL-50MM"].id, movement_type=MovementType.receipt, quantity=5, location_to_id=EC, reference="PO-2026-0032", performed_by="Almacenero", timestamp=ago(45)),

        # ── CON-OIL-15W40-20L: 8 - 2 - 2 + 5 = 9 ───────────────────────────
        dict(item_id=items["CON-OIL-15W40-20L"].id, movement_type=MovementType.issue,   quantity=-2, location_from_id=WS, reference="PM-2026-0134", performed_by="Mecánico Flores", timestamp=ago(55)),
        dict(item_id=items["CON-OIL-15W40-20L"].id, movement_type=MovementType.issue,   quantity=-2, location_from_id=WS, reference="PM-2026-0178", performed_by="Mecánico Flores", timestamp=ago(20)),
        dict(item_id=items["CON-OIL-15W40-20L"].id, movement_type=MovementType.receipt, quantity=5,  location_to_id=RA,   reference="PO-2026-0058", performed_by="Almacenero",       timestamp=ago(10)),

        # ── SAF-GLASSES-CLEAR: 20 - 5 - 3 = 12 ─────────────────────────────
        dict(item_id=items["SAF-GLASSES-CLEAR"].id, movement_type=MovementType.issue, quantity=-5, location_from_id=WH, reference="REQ-2026-0034", performed_by="SSOMA Díaz", timestamp=ago(65)),
        dict(item_id=items["SAF-GLASSES-CLEAR"].id, movement_type=MovementType.issue, quantity=-3, location_from_id=WH, reference="REQ-2026-0067", performed_by="SSOMA Díaz", timestamp=ago(33)),

        # ── SAF-HHAT-CLASE-E: 8 - 2 = 6 ────────────────────────────────────
        dict(item_id=items["SAF-HHAT-CLASE-E"].id, movement_type=MovementType.issue, quantity=-2, location_from_id=WH, reference="REQ-2026-0041", performed_by="SSOMA Díaz", timestamp=ago(50)),

        # ── ELC-CGLAND-M20: 25 - 5 + 10 = 30 ───────────────────────────────
        dict(item_id=items["ELC-CGLAND-M20"].id, movement_type=MovementType.issue,   quantity=-5,  location_from_id=WH, reference="WO-2026-0156", performed_by="Electricista Ramos", timestamp=ago(40)),
        dict(item_id=items["ELC-CGLAND-M20"].id, movement_type=MovementType.receipt, quantity=10,  location_to_id=RA,   reference="PO-2026-0051", performed_by="Almacenero",          timestamp=ago(20)),

        # ── ELC-CONT-LC1D25: 3 + 2 = 5 ─────────────────────────────────────
        dict(item_id=items["ELC-CONT-LC1D25"].id, movement_type=MovementType.receipt, quantity=2, location_to_id=RA, reference="PO-2026-0039", performed_by="Almacenero", timestamp=ago(30)),

        # ── HYD-OIL-ISO46-20L: 5 - 2 = 3 ───────────────────────────────────
        dict(item_id=items["HYD-OIL-ISO46-20L"].id, movement_type=MovementType.issue, quantity=-2, location_from_id=WS, reference="WO-2026-0123", performed_by="Hidráulico Quispe", timestamp=ago(60)),

        # ── CON-GREASE-400G: 10 - 3 - 2 = 5 ────────────────────────────────
        dict(item_id=items["CON-GREASE-400G"].id, movement_type=MovementType.issue, quantity=-3, location_from_id=WS, reference="PM-2026-0014", performed_by="Mecánico Flores", timestamp=ago(45)),
        dict(item_id=items["CON-GREASE-400G"].id, movement_type=MovementType.issue, quantity=-2, location_from_id=WS, reference="PM-2026-0021", performed_by="Mecánico Flores", timestamp=ago(18)),

        # ── MEC-PGAUGE-16BAR: 3 + 2 = 5 ────────────────────────────────────
        dict(item_id=items["MEC-PGAUGE-16BAR"].id, movement_type=MovementType.receipt, quantity=2, location_to_id=RA, reference="PO-2026-0044", performed_by="Almacenero", timestamp=ago(35)),

        # ── SAF-GLOVES-L: 20 - 5 - 5 = 10 ──────────────────────────────────
        dict(item_id=items["SAF-GLOVES-L"].id, movement_type=MovementType.issue, quantity=-5, location_from_id=WH, reference="REQ-2026-0028", performed_by="SSOMA Díaz", timestamp=ago(55)),
        dict(item_id=items["SAF-GLOVES-L"].id, movement_type=MovementType.issue, quantity=-5, location_from_id=WH, reference="REQ-2026-0055", performed_by="SSOMA Díaz", timestamp=ago(25)),

        # ── CON-CHAINOIL-1L: 10 - 4 = 6 ────────────────────────────────────
        dict(item_id=items["CON-CHAINOIL-1L"].id, movement_type=MovementType.issue, quantity=-4, location_from_id=WS, reference="PM-2026-0018", performed_by="Mecánico Flores", timestamp=ago(50)),

        # ── ELC-ESTOP-40MM: 5 + 2 = 7 ──────────────────────────────────────
        dict(item_id=items["ELC-ESTOP-40MM"].id, movement_type=MovementType.receipt, quantity=2, location_to_id=EC, reference="PO-2026-0037", performed_by="Almacenero", timestamp=ago(40)),

        # ── BRG-SKF-6305: 8 - 3 = 5 ────────────────────────────────────────
        dict(item_id=items["BRG-SKF-6305"].id, movement_type=MovementType.issue, quantity=-3, location_from_id=WH, reference="WO-2026-0167", performed_by="Técnico Martínez", timestamp=ago(45)),

        # ── HYD-SEAL-80MM: 5 - 1 = 4 ───────────────────────────────────────
        dict(item_id=items["HYD-SEAL-80MM"].id, movement_type=MovementType.issue, quantity=-1, location_from_id=EC, reference="WO-2026-0203", performed_by="Hidráulico Quispe", timestamp=ago(35)),

        # ── BLT-VBELT-C75: 8 - 2 = 6 ───────────────────────────────────────
        dict(item_id=items["BLT-VBELT-C75"].id, movement_type=MovementType.issue, quantity=-2, location_from_id=WH, reference="WO-2026-0143", performed_by="Técnico García", timestamp=ago(65)),

        # ── ELC-CGLAND-M25: 15 + 5 = 20 ────────────────────────────────────
        dict(item_id=items["ELC-CGLAND-M25"].id, movement_type=MovementType.receipt, quantity=5, location_to_id=RA, reference="PO-2026-0043", performed_by="Almacenero", timestamp=ago(55)),
    ]

    # Track per-item totals to identify which items need alerts after seeding
    item_totals: dict[int, float] = {}
    for m_data in movements_data:
        mov = StockMovement(**m_data)
        db.add(mov)
        item_id = m_data["item_id"]
        item_totals[item_id] = item_totals.get(item_id, 0.0) + m_data["quantity"]
    db.flush()

    # ── Reorder alerts for critical items below reorder point ────────────────
    for item in item_objs:
        qty = item_totals.get(item.id, 0.0)
        if qty < item.reorder_point and item.criticality == Criticality.critical:
            alert = ReorderAlert(
                item_id=item.id,
                triggered_at=now,
                status=AlertStatus.open,
                notes=f"Auto-generated: stock ({int(qty)}) is below reorder point ({item.reorder_point})",
            )
            db.add(alert)

    db.commit()
    db.close()
