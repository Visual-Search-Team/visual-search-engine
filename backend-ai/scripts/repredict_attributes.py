import os
import sys
import argparse
from sqlalchemy import select

# Thêm đường dẫn thư mục gốc vào sys.path để import được các module trong app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.clients.postgres_client import get_db, ImageEntity
from app.embedding.clip_model import clip_model
from app.qdrant.client import qdrant_client_wrapper

def main():
    parser = argparse.ArgumentParser(description='Dự đoán và cập nhật lại toàn bộ 9 thuộc tính AI cho ảnh cũ.')
    parser.add_argument('--batch-size', type=int, default=32, help='Số lượng ảnh xử lý mỗi lần')
    args = parser.parse_args()

    
    print("Sử dụng CLIP model đã load...")
    # clip_model đã được import trực tiếp
    
    print("Sử dụng Qdrant Client...")
    qdrant_client = qdrant_client_wrapper
    
    print("Kết nối PostgreSQL...")
    db = next(get_db())

    # Lấy TẤT CẢ các ảnh đã được index
    query = select(ImageEntity).where(ImageEntity.index_status == 'INDEXED')
    all_images = db.execute(query).scalars().all()
    
    total_images = len(all_images)
    print(f"Tìm thấy {total_images} ảnh đã được Index. Bắt đầu dán nhãn lại...")

    # Chạy theo từng đợt để tránh tốn quá nhiều RAM
    for i in range(0, total_images, args.batch_size):
        batch = all_images[i:i + args.batch_size]
        point_ids = []
        vectors = []
        
        # 1. Trích xuất vector từ Qdrant để tận dụng vector cũ, không cần tải lại file ảnh!
        for img in batch:
            point_ids.append(img.id)
            
        print(f"Tiến độ: {i}/{total_images}. Đang lấy vectors từ Qdrant...")
        # Lấy trực tiếp vector đã nhúng từ Qdrant
        qdrant_points = qdrant_client.client.retrieve(
            collection_name=qdrant_client.collection_name,
            ids=point_ids,
            with_vectors=True
        )
        
        if not qdrant_points:
            continue
            
        # Gom vectors lại theo thứ tự
        valid_ids = []
        retrieved_vectors = []
        
        for point in qdrant_points:
            valid_ids.append(point.id)
            retrieved_vectors.append(point.vector)
            
        # 2. Dùng Model dự đoán lại thuộc tính từ Vectors (rất nhanh vì không cần xử lý ảnh)
        print(f"Dự đoán 9 thuộc tính (bao gồm cả Tay áo, Cổ áo)...")
        attributes_list = clip_model.predict_all_attributes_batch(retrieved_vectors)
        
        # 3. Cập nhật lại vào Qdrant và PostgreSQL
        payloads = []
        for img_id, attrs in zip(valid_ids, attributes_list):
            payloads.append({"metadata_ai": attrs})
            
            # Cập nhật PostgreSQL
            # Tìm trong batch gốc
            img_entity = next((x for x in batch if x.id == img_id), None)
            if img_entity:
                img_entity.metadata_ai = attrs
                
        # Cập nhật đè Payload trên Qdrant (Vectors giữ nguyên)
        qdrant_client.upsert_vectors(point_ids=valid_ids, vectors=retrieved_vectors, payloads=payloads)
        
        # Commit PostgreSQL
        db.commit()
        print(f"Đã cập nhật xong {len(valid_ids)} ảnh.")
        
    print("\nHOÀN TẤT! Toàn bộ ảnh cũ đã được dán nhãn lại với 9 thuộc tính mới.")

if __name__ == "__main__":
    main()
