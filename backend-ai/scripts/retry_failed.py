import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.postgres_client import get_db, ImageEntity

def main():
    db = next(get_db())
    try:
        failed_count = db.query(ImageEntity).filter(ImageEntity.index_status == 'FAILED').count()
        if failed_count == 0:
            print("Không có ảnh nào bị FAILED.")
            return

        print(f"Phát hiện {failed_count} ảnh bị FAILED. Đang chuyển lại thành PROCESSING...")
        
        db.query(ImageEntity).filter(ImageEntity.index_status == 'FAILED').update({"index_status": "PROCESSING"})
        db.commit()
        
        print("Đã reset thành công! Bạn hãy khởi động lại container backend-ai để hệ thống tự động chạy tiếp.")
    except Exception as e:
        print(f"Lỗi: {e}")
        db.rollback()

if __name__ == "__main__":
    main()
