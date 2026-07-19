from sqlalchemy import create_engine, Column, BigInteger, String, Integer, DateTime, Numeric, Text, select, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import os
import datetime

Base = declarative_base()


class ImageEntity(Base):
    __tablename__ = 'images'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(BigInteger, nullable=True)
    uploaded_by = Column(BigInteger, nullable=True)
    original_filename = Column(String(500), nullable=True)
    storage_path = Column(String(1000), nullable=False)
    thumbnail_path = Column(String(1000), nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    checksum = Column(String(128), nullable=True, unique=True)
    index_status = Column(String(20), default="PENDING")
    indexed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ImageOcrEntity(Base):
    """Maps to the image_ocr table created by Java/Hibernate."""
    __tablename__ = 'image_ocr'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    image_id = Column(BigInteger, nullable=False)
    extracted_text = Column(Text, nullable=True)
    language = Column(String(20), nullable=True)
    confidence = Column(Numeric(5, 4), nullable=True)
    bounding_boxes = Column(JSON, nullable=True)   # Use JSON directly
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
host = os.environ.get("POSTGRES_HOST", "postgres")
port = os.environ.get("POSTGRES_PORT", "5432")
db = os.environ.get("POSTGRES_DB", "imagesearch")
user = os.environ.get("POSTGRES_USER", "postgres")
password = os.environ.get("POSTGRES_PASSWORD", "postgres")

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
