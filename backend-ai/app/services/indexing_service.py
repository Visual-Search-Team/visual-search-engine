import logging
import io
import json
import time
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.clients.postgres_client import ImageEntity, ImageOcrEntity
from app.clients.minio_client import minio_client_wrapper
from app.embedding.clip_model import clip_model
from app.qdrant.client import qdrant_client_wrapper
from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)

# Số luồng tải song song từ MinIO. Đây là I/O-bound (network call) nên chạy
# song song giúp giảm tổng thời gian chờ thay vì tải tuần tự từng ảnh.
_DOWNLOAD_WORKERS = 8

def process_pending_images(db: Session, batch_id: int | None = None):
    """
    Polls the database for images with index_status='PENDING' and processes them:
    - Generates CLIP embedding and upserts to Qdrant.
    - Updates status to 'INDEXED'.
    """
    # Find up to 64 pending images. If batch_id is provided, only process that batch.
    query = select(ImageEntity).where(ImageEntity.index_status == 'PENDING')
    if batch_id is not None:
        query = query.where(ImageEntity.batch_id == batch_id)

    # Dùng SKIP LOCKED để khóa dòng, ngăn các worker khác lấy trùng ảnh
    pending_images = db.execute(
        query.limit(64).with_for_update(skip_locked=True)
    ).scalars().all()

    if not pending_images:
        return
        
    # Đánh dấu trạng thái PROCESSING ngay lập tức sau khi khóa thành công
    for img in pending_images:
        img.index_status = 'PROCESSING'
    db.commit()

    logger.info(f"Found {len(pending_images)} pending images to index (batch_id={batch_id}).")

    valid_ids = []
    failed_ids = []
    # Bộ nhớ đệm: {image_id: PIL.Image đã giải mã} — dùng chung cho cả CLIP và OCR,
    # tránh phải tải + decode lại ảnh 2 lần từ MinIO.
    image_cache_dict: dict[int, Image.Image] = {}

    clip_start_time = time.time()

    # 1. Download images from MinIO (chỉ 1 lần cho cả CLIP lẫn OCR)
    # Tải song song bằng thread pool vì đây là I/O-bound (network call tới MinIO),
    # tải tuần tự sẽ cộng dồn độ trễ của từng request lại với nhau.
    def _download_and_decode(storage_path: str) -> Image.Image:
        """Download from MinIO and decode via PIL."""
        image_bytes = minio_client_wrapper.download_image(storage_path)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    with ThreadPoolExecutor(max_workers=_DOWNLOAD_WORKERS) as executor:
        future_to_image = {
            executor.submit(_download_and_decode, image.storage_path): image
            for image in pending_images
        }
        for future in as_completed(future_to_image):
            image = future_to_image[future]
            try:
                image_cache_dict[image.id] = future.result()
                valid_ids.append(image.id)
            except Exception as e:
                logger.error(f"Failed to load image id={image.id}: {e}")
                failed_ids.append(image.id)

    # 2 & 3. Batch Generate CLIP embeddings & Upsert to Qdrant
    if image_cache_dict:
        try:
            valid_images = [image_cache_dict[image_id] for image_id in valid_ids]
            embeddings = clip_model.get_image_embeddings(valid_images)
            qdrant_client_wrapper.upsert_vectors(point_ids=valid_ids, vectors=embeddings)
            
            # 4. Mark as INDEXED
            for image in pending_images:
                if image.id in valid_ids:
                    image.index_status = 'INDEXED'
                    image.indexed_at = datetime.datetime.utcnow()
                    image.updated_at = datetime.datetime.utcnow()
            
            logger.info(f"Successfully batch indexed {len(valid_ids)} images.")

            clip_duration = time.time() - clip_start_time
            speed = len(valid_ids) / clip_duration if clip_duration > 0 else 0
            logger.info(
                f"⏱️ [SPEED CLIP] Xử lý xong {len(valid_ids)} ảnh trong "
                f"{clip_duration:.2f}s. Tốc độ: {speed:.2f} ảnh/giây."
            )
        except Exception as e:
            logger.error(f"Batch embedding or upsert failed: {e}")
            # If batch fails, mark all valid ones as failed to retry later
            failed_ids.extend(valid_ids)

    # 5. Handle failures
    if failed_ids:
        for image in pending_images:
            if image.id in failed_ids:
                image.index_status = 'FAILED'
                image.updated_at = datetime.datetime.utcnow()
                logger.error(f"Marked image id={image.id} as FAILED.")

    # 6. Commit to Database
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Database commit failed: {e}")
        db.rollback()

    # 7. Run OCR on successfully indexed images (async, non-blocking for indexing)
    # Tái sử dụng ảnh đã tải & decode sẵn trong image_cache_dict — không tải lại từ MinIO.
    _run_ocr_for_images(db, image_cache_dict)


def _run_ocr_for_images(db: Session, image_cache_dict: dict[int, Image.Image]):
    """
    Chạy OCR trên từng ảnh ĐÃ được tải & giải mã sẵn (dùng chung với bước CLIP ở
    process_pending_images), tránh tải + decode lại ảnh lần thứ 2 từ MinIO.
    Lỗi OCR sẽ chỉ được log, KHÔNG làm hỏng quá trình indexing.
    """
    if not image_cache_dict:
        return

    ocr_start_time = time.time()
    # Gom các record OCR lại, chỉ commit 1 lần cuối thay vì mỗi ảnh 1 lần
    # commit -> giảm số round-trip đồng bộ tới Postgres.
    pending_ocr_records = []

    for image_id, pil_img in image_cache_dict.items():
        try:
            logger.info(f"[OCR] Đang chạy OCR cho image id={image_id} (ảnh dùng chung từ cache)")
            ocr_result = ocr_service.extract_text(pil_img)

            if not ocr_result.get('extractedText', '').strip():
                logger.info(f"[OCR] Không tìm thấy text trong image id={image_id}, bỏ qua.")
                continue

            ocr_record = ImageOcrEntity(
                image_id=image_id,
                extracted_text=ocr_result['extractedText'],
                language=ocr_result['language'],
                confidence=Decimal(str(min(ocr_result['avgConfidence'], 0.9999))),
                bounding_boxes=ocr_result['regions'],
            )
            pending_ocr_records.append(ocr_record)
            logger.info(
                f"[OCR] ✅ Trích xuất xong image id={image_id}: "
                f"{ocr_result['regionCount']} vùng text, "
                f"text='{ocr_result['extractedText'][:60]}'"
            )
        except Exception as e:
            logger.error(f"[OCR] ❌ Lỗi khi xử lý OCR image id={image_id}: {e}", exc_info=True)

    if pending_ocr_records:
        try:
            db.add_all(pending_ocr_records)
            db.commit()
            logger.info(f"[OCR] 💾 Đã lưu {len(pending_ocr_records)} bản ghi OCR vào DB (1 lần commit).")
        except Exception as e:
            logger.error(f"[OCR] ❌ Lỗi khi commit batch OCR: {e}", exc_info=True)
            db.rollback()

    ocr_duration = time.time() - ocr_start_time
    total_ocr = len(image_cache_dict)
    speed_ocr = total_ocr / ocr_duration if ocr_duration > 0 else 0
    logger.info(
        f"⏱️ [SPEED OCR] Quét chữ xong {total_ocr} ảnh trong "
        f"{ocr_duration:.2f}s. Tốc độ: {speed_ocr:.2f} ảnh/giây."
    )
