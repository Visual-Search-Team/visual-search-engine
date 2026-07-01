from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

	app_env: str = "docker"
	app_host: str = "0.0.0.0"
	app_port: int = 8000

	postgres_host: str = "postgres"
	postgres_port: int = 5432
	postgres_db: str = "imagesearch"
	postgres_user: str = "postgres"
	postgres_password: str = "postgres"

	qdrant_url: str = "http://qdrant:6333"
	qdrant_collection: str = "images"

	backend_java_url: str = "http://backend-java:8080"


settings = Settings()

