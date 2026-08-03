import logging
import io
import json
import time
import datetime
import os
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
_DOWNLOAD_WORKERS = max(1, int(os.environ.get("INDEXING_DOWNLOAD_WORKERS", "4")))
_SCAN_LIMIT = max(1, int(os.environ.get("INDEXING_SCAN_LIMIT", "16")))

def process_pending_images(db: Session):
    """
    Polls the database for images with index_status='PROCESSING' and processes them:
    - Generates CLIP embedding and upserts to Qdrant.
    - Updates status to 'INDEXED'.
    """
    # Find up to 32 processing images.
    query = select(ImageEntity).where(ImageEntity.index_status == 'PROCESSING')

    pending_images = db.execute(query.limit(_SCAN_LIMIT)).scalars().all()

    if not pending_images:
        return

    print(f"\\n🔍 [SCAN] Found {len(pending_images)} images with PROCESSING status to index.")
    logger.info(f"Found {len(pending_images)} images with PROCESSING status to index.")

    valid_ids = []
    failed_ids = []
    # Bộ nhớ đệm: {image_id: PIL.Image đã giải mã} — dùng chung cho cả CLIP và OCR,
    # tránh phải tải + decode lại ảnh 2 lần từ MinIO.
    image_cache_dict: dict[int, Image.Image] = {}

    clip_start_time = time.time()

    # 1. Download images from MinIO (chỉ 1 lần cho cả CLIP lẫn OCR)
    # Tải song song bằng thread pool vì đây là I/O-bound (network call tới MinIO),
    # tải tuần tự sẽ cộng dồn độ trễ của từng request lại với nhau.
    def _download_and_decode(image: ImageEntity) -> Image.Image:
        image_bytes = minio_client_wrapper.download_image(image.storage_path)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Thu nhỏ ảnh ngay lập tức để tiết kiệm RAM. 1000x1000 là quá đủ cho AI.
        img.thumbnail((1000, 1000))
        return img

    with ThreadPoolExecutor(max_workers=_DOWNLOAD_WORKERS) as executor:
        future_to_image = {
            executor.submit(_download_and_decode, image): image
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

            # 3b. Gắn 7 thuộc tính thời trang (category, color, pattern, style, material,
            # fit, gender) TRƯỚC KHI lưu vào Qdrant để đính kèm thành Payload.
            attributes_list = clip_model.predict_all_attributes_batch(embeddings)
            attributes_by_id = dict(zip(valid_ids, attributes_list))

            # Chuẩn bị danh sách payload
            payloads = []
            for img_id in valid_ids:
                img_entity = next(i for i in pending_images if i.id == img_id)
                payloads.append({
                    "image_id": img_entity.id,
                    "original_filename": img_entity.original_filename,  # đúng tên cột trong ORM
                    "uploaded_by": img_entity.uploaded_by,              # BigInteger (user_id)
                    "metadata_ai": attributes_by_id.get(img_id)
                })

            # Đẩy lên Qdrant kèm payload
            qdrant_client_wrapper.upsert_vectors(point_ids=valid_ids, vectors=embeddings, payloads=payloads)

            # 4. Mark as INDEXED
            for image in pending_images:
                if image.id in valid_ids:
                    image.index_status = 'INDEXED'
                    image.indexed_at = datetime.datetime.utcnow()
                    image.updated_at = datetime.datetime.utcnow()
                    image.metadata_ai = attributes_by_id.get(image.id)
            
            logger.info(f"Successfully batch indexed {len(valid_ids)} images with AI metadata.")

            clip_duration = time.time() - clip_start_time
            speed = len(valid_ids) / clip_duration if clip_duration > 0 else 0
            print(
                f"\\n========================================\\n"
                f"⏱️ [SPEED CLIP] Xử lý xong {len(valid_ids)} ảnh trong "
                f"{clip_duration:.2f}s. Tốc độ: {speed:.2f} ảnh/giây.\\n"
                f"========================================\\n"
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

    # Giải phóng sớm bộ nhớ ảnh sau mỗi vòng xử lý để tránh tích lũy RAM dài hạn.
    for cached_image in image_cache_dict.values():
        try:
            cached_image.close()
        except Exception:
            pass


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
                bounding_boxes=json.dumps(ocr_result['regions'], ensure_ascii=False),
            )

            pending_ocr_records.append(ocr_record)
            logger.info(
                f"[OCR]  Trích xuất xong image id={image_id}: "
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
    print(
        f"\\n========================================\\n"
        f"⏱️ [SPEED OCR] Quét chữ xong {total_ocr} ảnh trong "
        f"{ocr_duration:.2f}s. Tốc độ: {speed_ocr:.2f} ảnh/giây.\\n"
        f"========================================\\n"
    )

