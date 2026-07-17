import logging
import io
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image

from app.services.ocr_service import ocr_service
from app.services.ocr_batch_service import run_ocr_for_all_indexed
from app.clients.minio_client import minio_client_wrapper
from app.clients.postgres_client import get_db, ImageOcrEntity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])


# ── Request / Response schemas ────────────────────────────────────────────────

class OcrRequest(BaseModel):
    storagePath: str


class OcrRegion(BaseModel):
    text: str
    boundingBox: list[list[int]]
    confidence: float


class OcrResponse(BaseModel):
    extractedText: str
    regions: list[OcrRegion]
    language: str
    regionCount: int
    avgConfidence: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/extract", response_model=OcrResponse)
async def extract_text_from_storage(request: OcrRequest):
    """
    Trích xuất text từ ảnh đã lưu trong MinIO (gọi bằng storagePath).
    Dùng cho backend Java hoặc test internal.
    """
    logger.info(f"[OCR] extract từ storagePath={request.storagePath}")
    if not request.storagePath:
        raise HTTPException(status_code=400, detail="storagePath is required")
    try:
        image_bytes = minio_client_wrapper.download_image(request.storagePath)
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        result = ocr_service.extract_text(pil_img)
        logger.info(f"[OCR] ✅ Trích xuất xong: {result['regionCount']} vùng text, "
                    f"text='{result['extractedText'][:80]}'")
        return result
    except Exception as e:
        logger.error(f"[OCR] ❌ Lỗi extract: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")


@router.post("/test-upload", response_model=OcrResponse)
async def test_ocr_with_upload(file: UploadFile = File(...)):
    """
    TEST ENDPOINT: Upload ảnh trực tiếp để test OCR, không cần qua MinIO.
    Dùng để kiểm tra xem EasyOCR có hoạt động hay không.
    Gọi: POST /api/v1/ocr/test-upload với form-data key 'file'
    """
    logger.info(f"[OCR TEST] Nhận file: {file.filename}, type={file.content_type}")
    try:
        image_bytes = await file.read()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        result = ocr_service.extract_text(pil_img)
        logger.info(f"[OCR TEST] ✅ Kết quả: {result['regionCount']} vùng, "
                    f"text='{result['extractedText'][:120]}'")
        return result
    except Exception as e:
        logger.error(f"[OCR TEST] ❌ Lỗi: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR test failed: {str(e)}")


@router.get("/status")
async def ocr_status(db: Session = Depends(get_db)):
    """
    Kiểm tra trạng thái OCR: model đã load chưa, bảng image_ocr có bao nhiêu dòng.
    """
    try:
        reader_ready = ocr_service._reader is not None
        ocr_count = db.query(ImageOcrEntity).count()
        return {
            "easyocr_model_loaded": reader_ready,
            "image_ocr_table_row_count": ocr_count,
            "ocr_model_cache": ocr_service._reader is not None and "OK" or "not loaded yet",
        }
    except Exception as e:
        logger.error(f"[OCR STATUS] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-batch")
async def run_ocr_batch(background_tasks: BackgroundTasks, limit: int = 200):
    """
    Chạy OCR hàng loạt trên TẤT CẢ ảnh đã INDEXED nhưng chưa có dữ liệu OCR.
    Dùng khi bạn vừa thêm tính năng OCR và muốn cập nhật toàn bộ ảnh cũ.
    Chạy ngầm (background), không block request.
    Theo dõi tiến trình qua: docker logs -f visualsearch-backend-ai
    """
    logger.info(f"[OCR BATCH] Trigger batch OCR cho tối đa {limit} ảnh...")
    background_tasks.add_task(run_ocr_for_all_indexed, limit)
    return {
        "status": "started",
        "message": f"Đang chạy OCR batch cho tối đa {limit} ảnh trong nền. Theo dõi qua docker logs.",
    }
