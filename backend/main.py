"""LEANOR FOUNDATION INFO SHARE API — entry point.

Wiring only: build the app, attach the storage backend, mount the routers and
serve the built React frontend. Business logic lives in `routers/`, `schemas.py`,
`auth.py` and `storage.py`.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from routers import admin as admin_router
from routers import submissions as submissions_router
from storage import AstraStorage, MemoryStorage, Storage

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s  %(levelname)-7s %(name)s | %(message)s"
)
logger = logging.getLogger("leanor")


# ----------------------------------------------------------------- storage
def build_storage() -> Storage:
    """Pick the storage backend described by STORAGE_BACKEND / .env."""
    mode = settings.storage_backend

    if mode == "memory":
        logger.warning("STORAGE_BACKEND=memory — submissions are NOT persisted.")
        return MemoryStorage()

    if mode not in {"auto", "astra"}:
        raise RuntimeError(
            f"Unknown STORAGE_BACKEND={mode!r} (expected 'auto', 'astra' or 'memory')."
        )

    if not settings.has_astra_credentials:
        if mode == "astra":
            raise RuntimeError(
                "STORAGE_BACKEND=astra requires ASTRA_DB_API_ENDPOINT and "
                "ASTRA_DB_APPLICATION_TOKEN (see backend/.env.example)."
            )
        logger.warning(
            "No Astra credentials found — using in-memory storage "
            "(data is lost on restart). Copy backend/.env.example to backend/.env "
            "and fill in your Astra DB endpoint + application token."
        )
        return MemoryStorage()

    try:
        storage = AstraStorage(
            settings.astra_api_endpoint,
            settings.astra_application_token,
            settings.astra_collection,
        )
    except Exception:
        if mode == "astra":
            raise RuntimeError(
                "Could not connect to Astra DB — check ASTRA_DB_API_ENDPOINT "
                "and ASTRA_DB_APPLICATION_TOKEN."
            ) from None
        logger.exception("Astra DB connection failed; falling back to in-memory storage")
        return MemoryStorage()

    logger.info("Connected to Astra DB collection %r", settings.astra_collection)
    return storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.state.storage = build_storage()
    if not settings.auth_enabled:
        logger.warning(
            "Neither ADMIN_PASSWORD nor ADMIN_EMAIL is set — /admin is readable "
            "without signing in. Set both in backend/.env before going live."
        )
    elif not settings.credentials_complete:
        missing = "ADMIN_EMAIL" if not settings.admin_email else "ADMIN_PASSWORD"
        logger.warning(
            "%s is missing from backend/.env — admin sign-in will reject every "
            "attempt until both ADMIN_EMAIL and ADMIN_PASSWORD are set.",
            missing,
        )
    yield


# ------------------------------------------------------------------- app
app = FastAPI(
    title="LEANOR FOUNDATION INFO SHARE API",
    description=(
        "Collects visitor information and stores it in Astra DB. "
        "Docs: /docs"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(submissions_router.router)
app.include_router(admin_router.router)

# Uploaded photos are served back to the browser.
settings.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


# ------------------------------------------------- production React bundle
DIST = settings.frontend_dist
INDEX_HTML = DIST / "index.html"

if DIST.exists():
    assets = DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")
    for static_dir in DIST.glob("*.svg"):
        app.mount(
            f"/{static_dir.name}", StaticFiles(directory=static_dir), name=static_dir.stem
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        """Serve index.html for every non-API route so deep links work.

        The HTML is always revalidated (no-cache) — otherwise a browser can
        keep an old index.html that points at a hashed JS/CSS bundle we have
        since replaced, and that stale asset request 404s. Hashed files under
        /assets are content-addressed, so they stay cacheable.
        """
        candidate = (DIST / full_path).resolve()
        if full_path and candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(INDEX_HTML, headers={"Cache-Control": "no-cache"})


@app.get("/api", include_in_schema=False)
def api_root() -> dict:
    return {"name": "LEANOR FOUNDATION INFO SHARE API", "docs": "/docs", "health": "/api/health"}