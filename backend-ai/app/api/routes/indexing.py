from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import logging

from app.services.indexing_service import process_pending_images

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/indexing", tags=["Indexing"])


class TriggerIndexingRequest(BaseModel):
    batchId: int | None = None

@router.post("/trigger")
async def trigger_indexing(background_tasks: BackgroundTasks, payload: TriggerIndexingRequest | None = None):
    """
    Manually triggers the indexing process to run in the background.
    """
    batch_id = payload.batchId if payload else None
    logger.info(f"Manual indexing trigger requested. batch_id={batch_id}")
    
    # We pass the db session. Note that passing Depends(get_db) to a background task 
    # directly can sometimes cause issues if the session closes before the task finishes.
    # Therefore, a safer way is to create a fresh session inside the task.
    def run_indexing():
        from app.clients.postgres_client import SessionLocal
        local_db = SessionLocal()
        try:
            process_pending_images(local_db, batch_id=batch_id)
        finally:
            local_db.close()
            
    background_tasks.add_task(run_indexing)
    return {"status": "ok", "message": "Indexing triggered in background.", "batchId": batch_id}
