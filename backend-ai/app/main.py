import asyncio
import logging
import contextlib
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.routes import search, indexing, ocr
from app.services.indexing_service import process_pending_images
from app.clients.postgres_client import SessionLocal

# Setup basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Scheduler for background indexing
scheduler = AsyncIOScheduler()

def run_indexing_job():
    """Background job that polls the DB for pending images."""
    logger.debug("Running background indexing job...")
    db = SessionLocal()
    try:
        process_pending_images(db)
    finally:
        db.close()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start the background scheduler
    logger.info("Starting up FastAPI and background indexing scheduler...")
    # Run the job every 10 seconds
    scheduler.add_job(run_indexing_job, 'interval', seconds=10)
    scheduler.start()
    yield
    # Shutdown: stop the scheduler
    logger.info("Shutting down FastAPI and background scheduler...")
    scheduler.shutdown()

app = FastAPI(title="visual-search-backend-ai", version="0.1.0", lifespan=lifespan)

# Include Routers
app.include_router(search.router)
app.include_router(indexing.router)
app.include_router(ocr.router)

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "backend-ai"}
