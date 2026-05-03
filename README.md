# Project: Industrial Inventory Management System (Learning Build)

## Context
I am building a series of business systems to learn how industrial and supply chain 
companies work, with the goal of pivoting into IIoT / Industry 4.0 roles. This is 
the first and foundational module: inventory management. All future modules (POS, 
purchasing, work orders, accounting, AI forecasting) will connect to this one.

The mental model I am following: inventory is a real-time ledger of physical assets 
moving through a system. Every business event changes it. Build it to reflect that.

## Domain focus
Design this with an industrial / MRO (Maintenance, Repair & Operations) mindset — 
not a retail mindset. Items are spare parts, consumables, tools, and materials used 
to keep equipment running. Think: bearings, hydraulic seals, conveyor belts, 
lubricants, electrical fuses, safety equipment. Quantities are often small, unit 
costs are high, and a stockout has serious operational consequences.

## Tech stack
- Backend: Python, FastAPI, SQLAlchemy ORM
- Database: SQLite (file-based, easy to inspect and reset during learning)
- Frontend: Single HTML file with vanilla JS — no framework, keep it simple and readable
- No Docker, no CI/CD, no auth for now — this is a learning project

## Core data model — build these entities

1. **Category** — groups items (e.g. "Electrical", "Mechanical", "Hydraulics", "Safety", "Consumables")

2. **Supplier** — vendor who provides the item (name, contact, lead_time_days)

3. **Location** — physical storage location (e.g. "Warehouse A - Shelf 3", "Tool Room", "Emergency Cabinet")

4. **Item** — the core entity. Fields:
   - id, sku (unique code), name, description
   - category_id (FK), default_supplier_id (FK)
   - unit_of_measure (each, kg, liters, meters, etc.)
   - unit_cost
   - quantity_on_hand (always derived from movements, never edited directly)
   - reorder_point (minimum stock before alert triggers)
   - reorder_quantity (how much to order when triggered)
   - lead_time_days (days to receive from supplier)
   - criticality (enum: critical / important / standard)
   - is_active

5. **StockMovement** — the event ledger, never deleted. Fields:
   - id, item_id (FK), timestamp
   - movement_type (enum: receipt, issue, transfer, adjustment, initial_stock)
   - quantity (positive = stock in, negative = stock out)
   - location_from_id, location_to_id (nullable FKs)
   - reference (free text: PO number, work order number, reason)
   - performed_by (text)
   - notes

   quantity_on_hand on Item is always the SUM of all movements for that item.
   Never allow direct edits to quantity_on_hand.

6. **ReorderAlert** — auto-generated when item falls below reorder_point. Fields:
   - id, item_id, triggered_at, status (open / acknowledged / ordered / closed), notes

## Features to build (MVP scope)

### API endpoints (FastAPI)
- Full CRUD for: Category, Supplier, Location, Item
- StockMovement: POST only (movements are immutable once created), GET list with filters
- Items: GET with computed current stock, GET items below reorder point
- ReorderAlerts: GET list, PATCH to update status
- Dashboard summary: total items, total SKUs, items below reorder, total stock value

### Frontend (single index.html)
- Navigation sidebar with sections: Dashboard, Items, Movements, Alerts, Setup
- Dashboard: 4 metric cards (total SKUs, items in stock, items below reorder point, total inventory value), plus a simple table of the 5 most critical low-stock items
- Items list: table with search, filter by category and criticality, column for current stock and reorder status (green / amber / red indicator)
- New movement form: select item, movement type, quantity, location, reference — submit updates stock instantly
- Alerts list: show open reorder alerts with item details, acknowledge button
- Setup pages: simple forms for Category, Supplier, Location management

### Seed data — IMPORTANT
Seed the database with realistic industrial/mining data:
- 5 categories: Electrical, Mechanical, Hydraulics, Safety, Consumables
- 3 suppliers with realistic lead times (1 day local, 5 days Lima, 15 days import)
- 4 locations: Main Warehouse, Workshop Storeroom, Emergency Cabinet, Receiving Area
- 20 realistic spare parts items across categories, with realistic SKUs, unit costs,
  reorder points and criticality levels. Examples:
  - Bearing SKF 6205 (critical, mechanical)
  - Hydraulic seal kit 50mm (critical, hydraulics)
  - V-belt B68 (important, mechanical)
  - Cable gland M20 (standard, electrical)
  - Hard hat class E (important, safety)
  - Engine oil 15W40 20L (standard, consumables)
  etc.
- 50 stock movements spread over the past 90 days to create realistic history,
  including some items that are currently below their reorder point

## Business rules to enforce
- quantity_on_hand can never go negative (raise HTTP 400 if an issue would cause this)
- movement_type=adjustment requires a notes field (reason for adjustment)
- criticality=critical items below reorder point generate an immediate ReorderAlert
- SKU must be unique across all items
- lead_time_days on Item defaults to supplier.lead_time_days if not overridden

## Code quality expectations
- Pydantic schemas for all request/response validation
- Separate files: models.py, schemas.py, database.py, routers/ folder per entity
- A README.md explaining: what the system does, how to run it, the data model,
  and one paragraph explaining what MRO is and why this module matters
- Comments in complex business logic explaining the WHY, not just the what

## What NOT to build yet
Do not build: authentication, purchase orders, work orders, accounting entries, 
AI/ML features, Docker setup, or multi-tenancy. Those are future modules. 
Keep this module clean and focused so each future module has a clear seam to connect to.

## Start
Begin by creating the project structure and database models. Show me the folder 
structure first, then implement models.py, then database.py with seed data, 
then the FastAPI app and routers, then the frontend last.
