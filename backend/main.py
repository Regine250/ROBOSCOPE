import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from db import init_db
from scheduler import start_scheduler, shutdown_scheduler
from routers import papers, tags, saved, datasets, ingest, auth, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        start_scheduler()
    except Exception as e:
        print(f"Scheduler startup notice: {e}")
    yield
    try:
        shutdown_scheduler()
    except Exception as e:
        print(f"Scheduler shutdown notice: {e}")

app = FastAPI(
    title="RoboScope API",
    description="Robotics research paper feed, user authentication & dataset trajectory explorer backend",
    version="1.2.0",
    lifespan=lifespan,
)

cors_origins_env = os.getenv("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(papers.router)
app.include_router(tags.router)
app.include_router(saved.router)
app.include_router(datasets.router)
app.include_router(ingest.router)

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "RoboScope API", "version": "1.2.0"}

# Serve frontend static assets if built (for unified single-container free hosting)
STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_candidate = STATIC_DIR / full_path
        if file_candidate.exists() and file_candidate.is_file():
            return FileResponse(file_candidate)
        return FileResponse(STATIC_DIR / "index.html")
