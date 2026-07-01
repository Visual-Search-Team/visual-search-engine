# Huong dan thiet lap va chay du an VisualSearchEngine

Tai lieu nay danh cho thanh vien moi trong team de clone, cau hinh va chay du an nhanh nhat.

## 1. Yeu cau moi truong

- Git
- Docker Desktop (khuyen nghi ban moi)
- Docker Compose (di kem Docker Desktop)
- Neu chay local khong dung Docker:
  - Python 3.11+
  - Java 21
  - Maven 3.9+

## 2. Clone du an

```bash
git clone <repo-url>
cd VisualSearchEngine
```

## 3. Cau truc tong quan

- `backend-ai`: FastAPI service
- `backend-java`: Spring Boot service
- `docker-compose.yml`: file chay full stack
- `frontend`: thu muc frontend (dang scaffold)

## 4. Cau hinh bien moi truong

### 4.1 backend-ai

Tao file `.env` trong `backend-ai` (khong commit file nay):

```env
APP_ENV=docker
APP_HOST=0.0.0.0
APP_PORT=8000

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=imagesearch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=images

BACKEND_JAVA_URL=http://backend-java:8080
```

### 4.2 backend-java

Backend Java dang doc bien moi truong tu Docker Compose, chua bat buoc file `.env` rieng.
Neu can local profile rieng, co the tao `backend-java/.env` de luu bien tuy chinh (khong commit).

## 5. Chay full stack bang Docker

Tu thu muc goc `VisualSearchEngine`:

```bash
docker compose up -d --build
```

Kiem tra trang thai:

```bash
docker compose ps
```

## 6. Kiem tra nhanh cac service

- FastAPI health:
  - `http://localhost:8000/health`
- Qdrant:
  - `http://localhost:6333/`
- Backend Java:
  - `http://localhost:8080`
  - Co the tra `401` do Spring Security mac dinh, dieu nay van cho thay service da chay.

## 7. Dung he thong

```bash
docker compose down
```

Neu can xoa volume du lieu local:

```bash
docker compose down -v
```

## 8. Quy uoc Git cho team

Khong commit:

- File chua secret: `.env`, `.env.*`
- Thu muc tao boi IDE: `.idea/`, `.vscode/`
- Thu muc build/cache:
  - Python: `venv/`, `__pycache__/`, `.pytest_cache/`
  - Java: `target/`, `build/`
- Du lieu runtime lon:
  - `backend-ai/uploads/`
  - `backend-ai/models/`

Da co `.gitignore` o root va trong `backend-ai` de dam bao cac muc tren duoc bo qua.

## 9. Loi thuong gap

1. Loi Docker daemon khong chay
- Mo Docker Desktop truoc khi chay `docker compose up`.

2. Loi conflict dependency Python
- Kiem tra `backend-ai/requirements.txt` khong co package trung version.

3. Port bi trung
- Kiem tra `8000`, `8080`, `5432`, `6333` co dang duoc ung dung khac su dung hay khong.
