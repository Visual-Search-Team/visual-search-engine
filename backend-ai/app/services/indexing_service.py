import logging
import io
import datetime
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.clients.postgres_client import ImageEntity, ImageOcr
from app.clients.minio_client import minio_client_wrapper
from app.ocr.easyocr_service import ocr_service
from app.embedding.clip_model import clip_model
from app.qdrant.client import qdrant_client_wrapper

logger = logging.getLogger(__name__)

def process_pending_images(db: Session):
    """
    Polls the database for images with index_status='PENDING' and processes them:
    - Extracts OCR text and saves it.
    - Generates CLIP embedding and upserts to Qdrant.
    - Updates status to 'INDEXED'.
    """
    # Find up to 10 pending images per batch
    pending_images = db.execute(
        select(ImageEntity).where(ImageEntity.index_status == 'PENDING').limit(10)
    ).scalars().all()

    if not pending_images:
        return

    logger.info(f"Found {len(pending_images)} pending images to index.")

    for image in pending_images:
        logger.info(f"Processing image id={image.id}, path={image.storage_path}")
        try:
            # 1. Download image from MinIO
            image_bytes = minio_client_wrapper.download_image(image.storage_path)
            
            # 2. Extract OCR
            ocr_result = ocr_service.extract_text(image_bytes)
            
            image_ocr = ImageOcr(
                image_id=image.id,
                extracted_text=ocr_result["extracted_text"],
                language=ocr_result["language"],
                confidence=ocr_result["confidence"],
                bounding_boxes=ocr_result["bounding_boxes"],
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(image_ocr)
            
            # 3. Generate CLIP embedding
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            embedding = clip_model.get_image_embedding(pil_image)
            
            # 4. Upsert to Qdrant
            qdrant_client_wrapper.upsert_vector(point_id=image.id, vector=embedding)
            
            # 5. Mark as INDEXED
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

