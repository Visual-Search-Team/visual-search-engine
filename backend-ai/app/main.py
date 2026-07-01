from fastapi import FastAPI


app = FastAPI(title="visual-search-backend-ai", version="0.1.0")


@app.get("/health")
def health_check() -> dict:
	return {"status": "ok", "service": "backend-ai"}

