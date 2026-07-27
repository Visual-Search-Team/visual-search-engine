import json
import logging
from decimal import Decimal

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.embedding.clip_model import clip_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/embeddings", tags=["Embeddings"])

class ImageEmbeddingRequest(BaseModel):
    type: str
    imageUrl: str | None = None
    storagePath: str | None = None
    mimeType: str | None = None
    imageId: int | None = None

class TextEmbeddingRequest(BaseModel):
    type: str
    text: str | None = None

class EmbeddingResponse(BaseModel):
    embedding: list[float]


def _run_ocr_in_background(storage_path: str, image_id: int | None):
    """
    Chạy OCR ngầm sau khi Java đã lấy xong embedding.
    Lưu kết quả vào bảng image_ocr trong Postgres.
    """
    try:
        from app.clients.minio_client import minio_client_wrapper
        from app.clients.postgres_client import SessionLocal, ImageOcrEntity
        from app.services.ocr_service import ocr_service
        import io
        from PIL import Image

        logger.info(f"[OCR-BG] Bắt đầu OCR ngầm cho storagePath={storage_path}, imageId={image_id}")

        image_bytes = minio_client_wrapper.download_image(storage_path)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        ocr_result = ocr_service.extract_text(pil_image)

        if not ocr_result.get("extractedText", "").strip():
            logger.info(f"[OCR-BG] Không tìm thấy text trong ảnh storagePath={storage_path}, bỏ qua.")
            return

        if image_id is None:
            logger.warning(f"[OCR-BG] Không có imageId, không thể lưu OCR vào DB.")
            return

        db = SessionLocal()
        try:
            ocr_record = ImageOcrEntity(
                image_id=image_id,
                extracted_text=ocr_result["extractedText"],
                language=ocr_result["language"],
                confidence=Decimal(str(min(ocr_result["avgConfidence"], 0.9999))),
                bounding_boxes=json.dumps(ocr_result["regions"], ensure_ascii=False),
            )
            db.add(ocr_record)
            db.commit()
            logger.info(
                f"[OCR-BG] ✅ Lưu OCR thành công cho imageId={image_id}: "
                f"{ocr_result['regionCount']} vùng text, "
                f"text='{ocr_result['extractedText'][:60]}'"
            )
        except Exception as e:
            logger.error(f"[OCR-BG] ❌ Lỗi khi lưu OCR vào DB: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()

    except Exception as e:
        logger.error(f"[OCR-BG] ❌ Lỗi OCR ngầm cho storagePath={storage_path}: {e}", exc_info=True)


@router.post("/image", response_model=EmbeddingResponse)
async def get_image_embedding(request: ImageEmbeddingRequest, background_tasks: BackgroundTasks):
    """
    Java backend calls this API with type="image" and the storagePath.
    We will download the image, compute the embedding, and trigger OCR in background.
    """
    logger.info(f"Received image embedding request for storagePath={request.storagePath}, imageId={request.imageId}")
    if not request.storagePath:
        raise HTTPException(status_code=400, detail="storagePath is required")
        
    try:
        from app.clients.minio_client import minio_client_wrapper
        import io
        from PIL import Image
        
        image_bytes = minio_client_wrapper.download_image(request.storagePath)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        embedding = clip_model.get_image_embedding(pil_image)

        # Trigger OCR ngầm - không block việc trả embedding về cho Java
        background_tasks.add_task(_run_ocr_in_background, request.storagePath, request.imageId)

        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Error computing image embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/text", response_model=EmbeddingResponse)
async def get_text_embedding(request: TextEmbeddingRequest):
    """
    Java backend calls this API to get text embedding for semantic search.
    """
    logger.info(f"Received text embedding request for text='{request.text}'")
    if not request.text:
        raise HTTPException(status_code=400, detail="text is required")
        
    try:
        embedding = clip_model.get_text_embedding(request.text)
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Error computing text embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
