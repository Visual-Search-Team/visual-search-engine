import json
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, UploadFile, File, Form
from pydantic import BaseModel

from app.embedding.clip_model import clip_model
from app.embedding.query_parser import QueryParser
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

class ComposedEmbeddingRequest(BaseModel):
    type: str = "composed"
    storagePath: str
    text: str
    alpha: float | None = 0.7

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    filters: dict[str, list[str]] | None = None
    negative_filters: dict[str, list[str]] | None = None
    alpha_used: float | None = None


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
        filters, negative_filters, remaining_text, _ = QueryParser.extract_tags_from_text(request.text, 1.0)
        embedding = clip_model.get_text_embedding(remaining_text)
        if filters:
            logger.info(f"[Filter] Text search bóc tách filter: {filters}")
        return {"embedding": embedding, "filters": filters or None, "negative_filters": negative_filters or None}
    except Exception as e:
        logger.error(f"Error computing text embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/composed", response_model=EmbeddingResponse)
async def get_composed_embedding(request: ComposedEmbeddingRequest):
    """
    Java backend calls this API to get a composed (image + text) embedding.
    Downloads the image from MinIO, blends image and text embeddings using alpha weighting,
    and extracts metadata filters from the text query.
    """
    logger.info(f"Received composed embedding request: storagePath={request.storagePath}, text='{request.text}', alpha={request.alpha}")
    if not request.storagePath:
        raise HTTPException(status_code=400, detail="storagePath is required")
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    try:
        from app.clients.minio_client import minio_client_wrapper
        import io
        from PIL import Image

        image_bytes = minio_client_wrapper.download_image(request.storagePath)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        client_alpha_hint = request.alpha if request.alpha is not None else 0.7
        filters, negative_filters, remaining_text, alpha_used = QueryParser.extract_tags_from_text(request.text, client_alpha_hint)
        
        if not remaining_text:
            logger.info("remaining_text rỗng (chỉ có từ khoá làm filter cứng), bỏ qua text vector.")
            composed_emb = clip_model.get_image_embedding(pil_image)
        else:
            composed_emb = clip_model.get_composed_embedding(pil_image, remaining_text, alpha_used)
        
        return {
            "embedding": composed_emb,
            "filters": filters or None,
            "negative_filters": negative_filters or None,
            "alpha_used": alpha_used
        }
    except Exception as e:
        logger.error(f"Error computing composed embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Error computing embedding: {e}")
