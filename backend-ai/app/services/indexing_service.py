import logging
import io
import datetime
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.clients.postgres_client import ImageEntity
from app.clients.minio_client import minio_client_wrapper
from app.embedding.clip_model import clip_model
from app.qdrant.client import qdrant_client_wrapper

logger = logging.getLogger(__name__)

def process_pending_images(db: Session, batch_id: int | None = None):
    """
    Polls the database for images with index_status='PENDING' and processes them:
    - Generates CLIP embedding and upserts to Qdrant.
    - Updates status to 'INDEXED'.
    """
    # Find up to 10 pending images. If batch_id is provided, only process that batch.
    query = select(ImageEntity).where(ImageEntity.index_status == 'PENDING')
    if batch_id is not None:
        query = query.where(ImageEntity.batch_id == batch_id)

    pending_images = db.execute(query.limit(10)).scalars().all()

    if not pending_images:
        return

    logger.info(f"Found {len(pending_images)} pending images to index (batch_id={batch_id}).")

    for image in pending_images:
        logger.info(f"Processing image id={image.id}, path={image.storage_path}")
        try:
            # 1. Download image from MinIO
            image_bytes = minio_client_wrapper.download_image(image.storage_path)
            
            # 2. Generate CLIP embedding
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            embedding = clip_model.get_image_embedding(pil_image)
            
            # 3. Upsert to Qdrant
            qdrant_client_wrapper.upsert_vector(point_id=image.id, vector=embedding)
            
            # 4. Mark as INDEXED
            image.index_status = 'INDEXED'
            image.indexed_at = datetime.datetime.utcnow()
            image.updated_at = datetime.datetime.utcnow()
            
            db.commit()
            logger.info(f"Successfully indexed image id={image.id}")
            
        except Exception as e:
            logger.error(f"Failed to process image id={image.id}: {e}")
            db.rollback()
            # Mark as FAILED to prevent infinite loops
            try:
                image.index_status = 'FAILED'
                image.updated_at = datetime.datetime.utcnow()
                db.commit()
            except Exception as rollback_err:
                logger.error(f"Failed to update status to FAILED for image id={image.id}: {rollback_err}")
                db.rollback()

