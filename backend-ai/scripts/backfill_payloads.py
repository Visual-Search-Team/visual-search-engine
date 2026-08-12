import os
import sys

# Đảm bảo import được module app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.clients.postgres_client import ImageEntity, SessionLocal
from app.qdrant.client import qdrant_client_wrapper

def backfill():
    db = SessionLocal()
    try:
        # Lấy những ảnh đã được index thành công và có metadata_ai
        images = db.query(ImageEntity).filter(
            ImageEntity.metadata_ai.isnot(None),
            ImageEntity.index_status == 'INDEXED'
        ).all()
        
        print(f"Tìm thấy {len(images)} ảnh có metadata_ai trong Postgres.")
        
        for img in images:
            payload = {
                "image_id": img.id,
                "original_filename": img.original_filename,
                "uploaded_by": img.uploaded_by,
                "metadata_ai": img.metadata_ai
            }
            
            # Cập nhật/ghi đè Payload cho Point ID tương ứng trong Qdrant
            qdrant_client_wrapper.client.set_payload(
                collection_name=qdrant_client_wrapper.collection_name,
                payload=payload,
                points=[img.id],
                wait=True
            )
            print(f"Đã cập nhật Payload cho ảnh ID = {img.id}")
            
        print("Đồng bộ hoàn tất!")
    except Exception as e:
        print(f"Lỗi khi đồng bộ: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
