# Project Overview: Visual Search Engine (Fashion Domain)

Dự án Visual Search Engine là một hệ thống tìm kiếm hình ảnh nâng cao, được thiết kế đặc biệt và tối ưu hóa cho lĩnh vực thời trang/quần áo (Fashion Domain). Hệ thống cho phép người dùng tìm kiếm sản phẩm thông qua văn bản (mô tả) hoặc hình ảnh tương tự.

Dưới đây là chi tiết về kiến trúc tổng thể, các công nghệ và công cụ được sử dụng trong dự án.

## 1. Kiến trúc hệ thống (Architecture)
Hệ thống được thiết kế theo kiến trúc Microservices, bao gồm 3 thành phần chính:
- **Frontend**: Ứng dụng Web dành cho người dùng cuối.
- **Backend Java**: Dịch vụ xử lý nghiệp vụ chính (Business Logic), quản lý người dùng, lịch sử tìm kiếm và giao tiếp với database.
- **Backend AI (Python)**: Dịch vụ AI chuyên dụng để trích xuất đặc trưng (feature extraction) từ hình ảnh/văn bản và tính toán vector nhúng (embeddings).

## 2. Công nghệ và Framework (Tech Stack)

### 2.1. Frontend (Giao diện người dùng)
- **Framework:** React / Vite (Dựa trên cấu trúc file JSX).
- **Styling:** Tailwind CSS (Mang lại trải nghiệm giao diện hiện đại, dễ dàng tùy biến).
- **State Management & Data Fetching:** React Query (TanStack Query) cho việc quản lý trạng thái API và caching.
- **Routing:** React Router DOM.
- **UI Components:** React Icons, AOS (Animate On Scroll) cho các hiệu ứng cuộn trang, SweetAlert2 cho thông báo.

### 2.2. Backend Java (Core Services)
- **Framework:** Spring Boot (Java).
- **Data Access:** Spring Data JPA / JDBC.
- **Vai trò:** 
  - Đóng vai trò là cầu nối (API Gateway nội bộ) giữa Frontend và Backend AI.
  - Xử lý các logic liên quan đến metadata của hình ảnh, lịch sử tìm kiếm và đánh dấu (bookmark).
  - Quản lý việc lưu trữ file gốc lên Object Storage.

### 2.3. Backend AI (AI & Machine Learning Services)
- **Ngôn ngữ & Framework:** Python, FastAPI.
- **Machine Learning / Deep Learning:** 
  - **PyTorch:** Xử lý và chạy các mô hình AI.
  - **HuggingFace Transformers:** Quản lý và tải các mô hình ngôn ngữ/thị giác (Vision-Language Models).
- **Tối ưu hóa:** 
  - Tích hợp tính toán trên GPU (NVIDIA CUDA) để tăng tốc độ trích xuất vector.
  - Hỗ trợ cache mô hình AI (Base Model Cache) để khởi động nhanh hơn.

## 3. Cơ sở dữ liệu và Lưu trữ (Databases & Storage)

Hệ thống sử dụng nhiều loại cơ sở dữ liệu khác nhau để đáp ứng các nhu cầu đặc thù:

- **Relational Database (PostgreSQL):** 
  - Quản lý dữ liệu có cấu trúc (thông tin file, lịch sử tìm kiếm của người dùng, v.v.).
- **Vector Database (Qdrant):** 
  - Lưu trữ các vector nhúng (embeddings) được tạo ra từ hình ảnh và văn bản.
  - Thực hiện các truy vấn tìm kiếm độ tương đồng (Similarity Search) với tốc độ cao.
- **Object Storage (MinIO):** 
  - Lưu trữ trực tiếp các tệp hình ảnh được tải lên (S3-compatible).
  - Đảm nhiệm việc phân phối hình ảnh tĩnh.

## 4. DevOps & Triển khai (Deployment)

- **Containerization:** Docker & Docker Compose.
  - Toàn bộ các dịch vụ (Frontend, Backend Java, Backend AI, Postgres, Qdrant, MinIO) đều được đóng gói thành các Docker container.
- **Quản lý tài nguyên:** 
  - Tích hợp NVIDIA Container Toolkit để cho phép Backend AI truy cập và sử dụng GPU của máy host.
  - Các Volume riêng biệt được thiết lập cho Database, Object Storage và AI Model Cache nhằm đảm bảo tính toàn vẹn và lưu trữ lâu dài của dữ liệu.
