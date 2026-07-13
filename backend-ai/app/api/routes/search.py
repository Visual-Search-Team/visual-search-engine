import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.embedding.clip_model import clip_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/embeddings", tags=["Embeddings"])

class ImageEmbeddingRequest(BaseModel):
    type: str
    imageUrl: str | None = None
    storagePath: str | None = None
    mimeType: str | None = None

class TextEmbeddingRequest(BaseModel):
    type: str
    text: str | None = None

class EmbeddingResponse(BaseModel):
    embedding: list[float]

@router.post("/image", response_model=EmbeddingResponse)
async def get_image_embedding(request: ImageEmbeddingRequest):
    """
    Java backend calls this API with type="image" and the storagePath.
    We will download the image and compute the embedding.
    """
    logger.info(f"Received image embedding request for storagePath={request.storagePath}")
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
        embedding = clip_model.get_text_embedding(request.text)
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Error computing text embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
