import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db, seed_db
from routers import alerts, categories, dashboard, items, locations, movements, suppliers

app = FastAPI(
    title="Industrial Inventory Management System",
    description="MRO inventory ledger for industrial/mining operations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router,  prefix="/api/categories",  tags=["Categories"])
app.include_router(suppliers.router,   prefix="/api/suppliers",   tags=["Suppliers"])
app.include_router(locations.router,   prefix="/api/locations",   tags=["Locations"])
app.include_router(items.router,       prefix="/api/items",       tags=["Items"])
app.include_router(movements.router,   prefix="/api/movements",   tags=["Movements"])
app.include_router(alerts.router,      prefix="/api/alerts",      tags=["Alerts"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])


@app.on_event("startup")
def startup():
    init_db()
    seed_db()


if os.path.isdir("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str = ""):
    dist_file = os.path.join("frontend/dist", full_path)
    if full_path and os.path.isfile(dist_file):
        return FileResponse(dist_file)
    return FileResponse("frontend/dist/index.html")


def run():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    run()
