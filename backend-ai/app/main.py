import asyncio
import logging
import contextlib
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.api.routes import search, indexing
from app.services.indexing_service import process_pending_images
from app.clients.postgres_client import SessionLocal
from app.embedding.clip_model import clip_model

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

    # Nạp lại toàn bộ brand đã lưu trong DB vào từ điển tìm kiếm.
    # add_dynamic_brand() chỉ lưu vào RAM nên mỗi lần restart container
    # thì brand filter bị mất — bước này khôi phục lại toàn bộ.
    try:
        db = SessionLocal()
        rows = db.execute(
            text("SELECT DISTINCT metadata_ai->>'brand' AS brand FROM images WHERE metadata_ai->>'brand' IS NOT NULL AND is_deleted = false")
        ).fetchall()
        db.close()
        loaded = []
        for row in rows:
            brand_val = row[0]
            if brand_val:
                clip_model.add_dynamic_brand(brand_val)
                loaded.append(brand_val)
        if loaded:
            logger.info(f"[Startup] Đã nạp lại {len(loaded)} brand từ DB vào từ điển tìm kiếm: {loaded}")
        else:
            logger.info("[Startup] Không tìm thấy brand nào trong DB để nạp.")
    except Exception as e:
        logger.warning(f"[Startup] Không thể nạp brand từ DB (sẽ tự recover khi indexing): {e}")

    # Run the job every 2 seconds
    scheduler.add_job(run_indexing_job, 'interval', seconds=2)
    scheduler.start()
    yield
    # Shutdown: stop the scheduler
    logger.info("Shutting down FastAPI and background scheduler...")
    scheduler.shutdown()

app = FastAPI(title="visual-search-backend-ai", version="0.1.0", lifespan=lifespan)

# Include Routers
app.include_router(search.router)
app.include_router(indexing.router)

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "backend-ai"}
