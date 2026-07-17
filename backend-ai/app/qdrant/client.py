from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct
import os
import logging

logger = logging.getLogger(__name__)

class QdrantClientWrapper:
    def __init__(self):
        url = os.environ.get("QDRANT_URL", "http://qdrant:6333")
        self.collection_name = os.environ.get("QDRANT_COLLECTION", "images")
        api_key = os.environ.get("QDRANT_API_KEY", None)
        
        logger.info(f"Connecting to Qdrant at {url}...")
        self.client = QdrantClient(url=url, api_key=api_key)
        
    def upsert_vector(self, point_id: int, vector: list[float]):
        """
        Upserts a vector using the image ID as the point ID.
        We don't need to store payload here since backend-java fetches from postgres by ID.
        """
        point = PointStruct(
            id=point_id,
            vector=vector,
            payload={} # Payload is managed by Postgres
        )
        self.client.upsert(
            collection_name=self.collection_name,
            points=[point],
            wait=True
        )

    def upsert_vectors(self, point_ids: list[int], vectors: list[list[float]]):
        """
        Upserts multiple vectors efficiently in one batch.
        """
        if not point_ids or not vectors or len(point_ids) != len(vectors):
            return
            
        points = [
            PointStruct(id=pid, vector=vec, payload={})
            for pid, vec in zip(point_ids, vectors)
        ]
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True
        )

qdrant_client_wrapper = QdrantClientWrapper()
