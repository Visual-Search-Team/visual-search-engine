import io
import os
import time
from typing import List, Dict, Any

import torch
import torch.nn.functional as F
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Header
from pydantic import BaseModel

from qdrant_client import QdrantClient
import open_clip
from dotenv import load_dotenv
load_dotenv()

# ====== CONFIG (đọc từ environment variables) ======
QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "image_search_SBI")

# API key nội bộ để Backend gọi vào AI module - để trống nếu chưa cần auth
SERVICE_API_KEY = os.environ.get("SERVICE_API_KEY")

MODEL_NAME = "ViT-B-32-quickgelu"
PRETRAINED = "openai"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="AI Module - Visual Search Engine (Search by Image + Search by Text)")

# ====== LOAD MODEL + TOKENIZER + QDRANT CLIENT (1 lần khi server start) ======
model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED)
model = model.to(DEVICE).eval()
tokenizer = open_clip.get_tokenizer(MODEL_NAME)

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


class SearchResultItem(BaseModel):
    id: int
    score: float
    payload: Dict[str, Any]  # metadata thô lưu trong Qdrant (path, v.v.) - Backend tự xử lý tiếp


class SearchResponse(BaseModel):
    query_time_ms: float
    top_k: int
    results: List[SearchResultItem]


def _check_api_key(x_api_key):
    if SERVICE_API_KEY and x_api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _query_qdrant(query_vector, top_k):
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
    )
    return [
        SearchResultItem(id=point.id, score=point.score, payload=point.payload)
        for point in response.points
    ]


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}


@app.post("/search/image", response_model=SearchResponse)
async def search_by_image(
    file: UploadFile = File(...),
    top_k: int = Query(20, ge=1, le=100),
    x_api_key: str = Header(None),
):
    _check_api_key(x_api_key)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File upload phải là ảnh")

    t0 = time.time()

    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Không đọc được ảnh, file có thể bị hỏng")

    img_t = preprocess(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        feat = model.encode_image(img_t)
        feat = F.normalize(feat, dim=-1)
    query_vector = feat.cpu().numpy()[0].tolist()

    results = _query_qdrant(query_vector, top_k)
    elapsed_ms = (time.time() - t0) * 1000

    return SearchResponse(query_time_ms=elapsed_ms, top_k=top_k, results=results)


@app.get("/search/text", response_model=SearchResponse)
def search_by_text(
    q: str = Query(..., min_length=1, description="Mô tả nội dung ảnh, ví dụ: 'a red car on a street'"),
    top_k: int = Query(20, ge=1, le=100),
    x_api_key: str = Header(None),
):
    _check_api_key(x_api_key)

    t0 = time.time()

    text_tokens = tokenizer([q]).to(DEVICE)
    with torch.no_grad():
        feat = model.encode_text(text_tokens)
        feat = F.normalize(feat, dim=-1)
    query_vector = feat.cpu().numpy()[0].tolist()

    results = _query_qdrant(query_vector, top_k)
    elapsed_ms = (time.time() - t0) * 1000

    return SearchResponse(query_time_ms=elapsed_ms, top_k=top_k, results=results)
