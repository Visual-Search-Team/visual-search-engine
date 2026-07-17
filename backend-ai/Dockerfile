FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LORA_WEIGHTS_DIR=/app/lora-weights

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --default-timeout=100 --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]