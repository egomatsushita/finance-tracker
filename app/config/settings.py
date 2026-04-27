from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    secret_key: str
    algorithm: str = "HS256"
    database_url: str = "sqlite+aiosqlite:///database.db"
    uvicorn_host: str = "127.0.0.1"
    uvicorn_port: int = 8000
    access_token_expire_minute: int = 30
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
