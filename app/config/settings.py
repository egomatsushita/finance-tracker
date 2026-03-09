from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///database.db"
    uvicorn_host: str = "127.0.0.1"
    uvicorn_port: int = 8000

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
