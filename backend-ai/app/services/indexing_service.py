import gc
import logging
import io
import json
import time
import datetime
import os
import re
import torch
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.clients.postgres_client import ImageEntity
from app.clients.minio_client import minio_client_wrapper
from app.embedding.clip_model import clip_model
from app.embedding.constants import ATTRIBUTE_VI_LABELS
from app.qdrant.client import qdrant_client_wrapper
from app.utils.color_extractor import color_extractor


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
    query = select(ImageEntity).where(
        ImageEntity.index_status.in_(['PENDING', 'PROCESSING']),
        ImageEntity.is_deleted.is_(False)
    )

    pending_images = db.execute(query.limit(_SCAN_LIMIT)).scalars().all()

    if not pending_images:
        return

    print(f"\n🔍 [SCAN] Found {len(pending_images)} images with PROCESSING status to index.")
    logger.info(f"Found {len(pending_images)} images with PROCESSING status to index.")
    valid_ids = []
    failed_ids = []
    image_cache_dict: dict[int, Image.Image] = {}

    clip_start_time = time.time()

    def _download_and_decode(image: ImageEntity) -> Image.Image:
        image_bytes = minio_client_wrapper.download_image(image.storage_path)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
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

    if image_cache_dict:
        try:
            valid_images = [image_cache_dict[image_id] for image_id in valid_ids]
            embeddings = clip_model.get_image_embeddings(valid_images)

            attributes_list = clip_model.predict_all_attributes_batch(embeddings)
            attributes_by_id = dict(zip(valid_ids, attributes_list))
            
            # Ghi đè thuộc tính color bằng K-Means + LAB từ OpenCV & rembg
            for img_id, img_obj in zip(valid_ids, valid_images):
                dom_colors_en_details = color_extractor.get_dominant_colors(img_obj)
                
                # Dịch sang tiếng Việt
                color_dict_vi = ATTRIBUTE_VI_LABELS["color"]
                
                # Chỉ lấy mảng tên màu lưu vào "color" để Java filter (VD: ["Đỏ", "Trắng"])
                dom_colors_vi = [color_dict_vi.get(c["name"], c["name"]) for c in dom_colors_en_details]
                
                # Lưu chi tiết phần trăm vào một field riêng để hiển thị UI
                dom_colors_details_vi = [
                    {"name": color_dict_vi.get(c["name"], c["name"]), "percent": c["percent"]}
                    for c in dom_colors_en_details
                ]
                
                # Lưu ý: thuộc tính metadata_ai trong model cho phép dict tùy ý
                if img_id in attributes_by_id:
                    # Gán mảng các màu (top 2 màu) vào thuộc tính 'color'
                    attributes_by_id[img_id]["color"] = dom_colors_vi
                    attributes_by_id[img_id]["color_details"] = dom_colors_details_vi

            # Dict lookup O(1) thay vì next() O(n) bên trong vòng lặp -> tránh O(n^2)
            entity_map = {img.id: img for img in pending_images}

            payloads = []
            for img_id in valid_ids:
                img_entity = entity_map[img_id]
                filename = img_entity.original_filename or ""
                
                metadata = attributes_by_id.get(img_id)
                if metadata:
                    match = re.search(r'_BRAND_(.*?)_BRAND_', filename)
                    if match:
                        manual_brand = match.group(1).strip().lower() # Giữ chữ thường như đã thống nhất
                        metadata["brand"] = manual_brand
                        logger.info(f"[MANUAL OVERRIDE] Ghi đè brand='{manual_brand}' cho image id={img_id}")
                        
                        # AI tự động nạp brand này vào từ điển text search (nếu chưa có)
                        clip_model.add_dynamic_brand(manual_brand)
                        
                        clean_filename = re.sub(r'_BRAND_.*?_BRAND_', '', filename)
                        img_entity.original_filename = clean_filename
                        filename = clean_filename

                payloads.append({
                    "image_id": img_entity.id,
                    "original_filename": filename,
                    "uploaded_by": img_entity.uploaded_by,
                    "metadata_ai": metadata
                })

            qdrant_client_wrapper.upsert_vectors(point_ids=valid_ids, vectors=embeddings, payloads=payloads)

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
                f"\n========================================\n"
                f"⏱️ [SPEED CLIP] Xử lý xong {len(valid_ids)} ảnh trong "
                f"{clip_duration:.2f}s. Tốc độ: {speed:.2f} ảnh/giây.\n"
                f"========================================\n"
            )
        except Exception as e:
            logger.error(f"Batch embedding or upsert failed: {e}")
            failed_ids.extend(valid_ids)

    if failed_ids:
        for image in pending_images:
            if image.id in failed_ids:
                image.index_status = 'FAILED'
                image.updated_at = datetime.datetime.utcnow()
                logger.error(f"Marked image id={image.id} as FAILED.")

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Database commit failed: {e}")
        db.rollback()

    # Dọn rác bộ nhớ CLIP ngay sau khi commit
    try:
        del valid_images
        del embeddings
    except NameError:
        pass

    for cached_image in image_cache_dict.values():
        try:
            cached_image.close()
        except Exception:
            pass

    image_cache_dict.clear()

    # Giải phóng VRAM cache nếu đang chạy trên GPU, bỏ qua nếu CPU-only
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    logger.info("[MEM] Đã dọn sạch bộ nhớ sau batch.")