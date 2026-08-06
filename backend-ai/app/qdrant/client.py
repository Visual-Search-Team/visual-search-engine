import logging 
import os
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct


logger = logging.getLogger(__name__)

class QdrantClientWrapper:
    def __init__(self):
        url = os.environ.get("QDRANT_URL","http://qdrant:6333")
        self.collection_name = os.environ.get("QDRANT_COLLECTION","images")
        api_key = os.environ.get("QDRANT_API_KEY",None)

        logger.info(f"đang kết nối tới qdrant tại {url}")
        self.client = QdrantClient(url =url,api_key = api_key)
    
    # đẩy 1 vector đặc trưng lên qdrant (update và insert)
    def upsert_vector(self,point_id: int, vector: list[float]):
        point = PointStruct(
            id = point_id,
            vector = vector,
            payload = {}
        )
        self.client.upsert(
            collection_name = self.collection_name,
            points =[point],
            wait = True,
        )
    
    # Đẩy cùng lúc nhiều vector đặc trưng lên qdrant
    def upsert_vectors(self, point_ids: list[int], vectors: list[list[float]], payloads: list[dict] = None):
        if not point_ids or not vectors or len(point_ids) != len(vectors):
            return
        
        if payloads is None:
            payloads = [{}] * len(point_ids)
            
        points = [
            PointStruct(id=pid, vector=vec, payload=payload)
            for pid, vec, payload in zip(point_ids, vectors, payloads)
        ]

        self.client.upsert(
            collection_name = self.collection_name,
            points = points,
            wait = True
        )

qdrant_client_wrapper = QdrantClientWrapper()
