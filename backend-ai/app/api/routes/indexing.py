from fastapi import APIRouter, BackgroundTasks
import logging

from app.services.indexing_service import process_pending_images

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/indexing", tags=["Indexing"])


@router.post("/trigger")
async def trigger_indexing(background_tasks: BackgroundTasks):
    """
    Manually triggers the indexing process to run in the background.
    """
    logger.info("Manual indexing trigger requested.")

    def run_indexing():
        from app.clients.postgres_client import SessionLocal
        local_db = SessionLocal()
        try:
            process_pending_images(local_db)
        finally:
            local_db.close()

    background_tasks.add_task(run_indexing)
    return {"status": "ok", "message": "Indexing triggered in background."}
