import os
import logging
from minio import Minio

logger = logging.getLogger(__name__)

class MinIOClientWrapper:
    def __init__(self):
        # Read from environment variables
        endpoint = os.environ.get("MINIO_ENDPOINT", "http://minio:9000")
        access_key = os.environ.get("MINIO_ACCESS_KEY", "admin")
        secret_key = os.environ.get("MINIO_SECRET_KEY", "password123")
        self.bucket = os.environ.get("MINIO_BUCKET", "images")
        
        # Remove http:// or https:// from endpoint for the python minio client
        if endpoint.startswith("http://"):
            endpoint = endpoint[7:]
            secure = False
        elif endpoint.startswith("https://"):
            endpoint = endpoint[8:]
            secure = True
        else:
            secure = False
            
        logger.info(f" Kết nối tới MinIO tại địa chỉ:{endpoint}...")
        import urllib3
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
            http_client=urllib3.PoolManager(
                maxsize=20,        # tăng pool từ 10 lên 20, đủ cho 16 download workers
                timeout=urllib3.Timeout(connect=5, read=30),
            )
        )
    
    # Tải ảnh về từ MinIO
    def download_image(self, storage_path: str) -> bytes:
        """
        Downloads a file directly from MinIO using the storage path.
        Returns the file content as bytes.
        """
        try:
            response = self.client.get_object(self.bucket, storage_path)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except Exception as e:
            logger.error(f" Lỗi khi download {storage_path} từ MinIO: {e}")
            raise

minio_client_wrapper = MinIOClientWrapper()
