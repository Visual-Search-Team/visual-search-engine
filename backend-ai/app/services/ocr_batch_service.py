"""
OCR Retroactive Service - chạy OCR trên tất cả ảnh đã INDEXED nhưng chưa có dữ liệu OCR.
Dùng khi: cài thêm tính năng OCR sau khi đã index ảnh từ trước.
"""
import io
import logging
from decimal import Decimal
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import select, not_, exists

from app.clients.postgres_client import ImageEntity, ImageOcrEntity, SessionLocal
from app.clients.minio_client import minio_client_wrapper
from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)


def run_ocr_for_all_indexed(limit: int = 500) -> dict:
    """
    Quét tất cả ảnh có status=INDEXED mà chưa có bản ghi trong image_ocr,
    chạy OCR và lưu kết quả vào DB.

    Trả về: {"processed": N, "saved": N, "skipped_no_text": N, "errors": N}
    """
    db: Session = SessionLocal()
    try:
        # Lấy danh sách ảnh INDEXED chưa có OCR
        already_ocr_subquery = select(ImageOcrEntity.image_id)
        query = (
            select(ImageEntity)
            .where(ImageEntity.index_status == 'INDEXED')
            .where(~ImageEntity.id.in_(already_ocr_subquery))
            .limit(limit)
        )
        images = db.execute(query).scalars().all()

        total = len(images)
        logger.info(f"[OCR BATCH] Tìm thấy {total} ảnh INDEXED chưa có OCR. Bắt đầu xử lý...")

        saved = 0
        skipped = 0
        errors = 0

        for i, image in enumerate(images, 1):
            try:
                logger.info(f"[OCR BATCH] [{i}/{total}] Đang xử lý image id={image.id}")
                image_bytes = minio_client_wrapper.download_image(image.storage_path)
                pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                result = ocr_service.extract_text(pil_img)

                if not result.get('extractedText', '').strip():
                    logger.info(f"[OCR BATCH] Không có text trong image id={image.id}, bỏ qua.")
                    skipped += 1
                    continue

                ocr_record = ImageOcrEntity(
                    image_id=image.id,
                    extracted_text=result['extractedText'],
                    language=result['language'],
                    confidence=Decimal(str(min(result['avgConfidence'], 0.9999))),
                    bounding_boxes=result['regions'],
                )
                db.add(ocr_record)
                db.commit()
                saved += 1
                logger.info(
                    f"[OCR BATCH] ✅ Lưu xong id={image.id}: "
                    f"{result['regionCount']} vùng, text='{result['extractedText'][:60]}'"
                )

            except Exception as e:
                errors += 1
                logger.error(f"[OCR BATCH] ❌ Lỗi image id={image.id}: {e}", exc_info=True)
                db.rollback()

        summary = {
            "total_found": total,
            "saved": saved,
            "skipped_no_text": skipped,
            "errors": errors,
        }
        logger.info(f"[OCR BATCH] Hoàn tất: {summary}")
        return summary

    finally:
        db.close()
