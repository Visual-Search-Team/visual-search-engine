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
    filters: dict[str, list[str]] | None = None



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

        # Zero-shot prediction toàn bộ thuộc tính của ảnh query.
        # Dùng cho Two-stage retrieval: Re-ranking (Soft filter) ở backend-java.
        # Không dùng làm Hard filter vì dễ bị false negative.
        attrs = clip_model.predict_all_attributes(embedding)
        filters: dict = {}
        for k in ["category", "color", "pattern", "style", "sleeve", "neckline", "gender"]:
            if attrs.get(k):
                filters[k] = [attrs[k]]

        return {"embedding": embedding, "filters": filters if filters else None}
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
        filters = clip_model.extract_tags_from_text(request.text)
        if filters:
            logger.info(f"[Filter] Bóc tách được filter từ query: {filters}")
        return {"embedding": embedding, "filters": filters or None}
    except Exception as e:
        logger.error(f"Error computing text embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
