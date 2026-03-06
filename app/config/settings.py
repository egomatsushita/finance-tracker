from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    UVICORN_HOST: str = "127.0.0.1"
    UVICORN_PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
