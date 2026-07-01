# VisualSearchEngine

Monorepo for the VisualSearchEngine system.

## Modules

- `backend-ai`: FastAPI service for OCR/embedding/indexing/search APIs.
- `backend-java`: Spring Boot service for business/auth/integration APIs.
- `frontend`: UI application (currently scaffold folder).
- Shared infra services: PostgreSQL and Qdrant.

## Architecture (Docker Compose)

Main compose file for the entire project:

- `docker-compose.yml` (at workspace root)

This compose runs:

- `backend-ai` on `:8000`
- `backend-java` on `:8080`
- `postgres` on `:5432`
- `qdrant` on `:6333`

## Start Full Stack

```bash
docker compose -f docker-compose.yml up -d --build
```

## Stop Full Stack

```bash
docker compose -f docker-compose.yml down
```

## Internal Service Communication

- `backend-java` -> `backend-ai`: `http://backend-ai:8000`
- `backend-ai` -> `backend-java`: `http://backend-java:8080`
- Both backends -> `postgres`: `postgres:5432`
- Both backends -> `qdrant`: `http://qdrant:6333`

## Quick Checks

```bash
curl http://localhost:8000/health
curl http://localhost:6333/
```

`backend-java` may return `401` at `/` by default when Spring Security is enabled, which still confirms service is up.
