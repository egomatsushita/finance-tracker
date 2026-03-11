from fastapi import FastAPI
import uvicorn

from config.settings import settings
from routers.user import user_router

app = FastAPI(title="Personal Finance Tracker")
app.include_router(user_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.uvicorn_host, port=settings.uvicorn_port, reload=True)
