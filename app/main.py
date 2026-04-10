import uvicorn
from fastapi import FastAPI

from config.settings import settings
from exception_handlers import register_exception_handlers
from routers.admin_user import admin_user_router
from routers.auth import auth_router
from routers.user import user_router

app = FastAPI(title="Personal Finance Tracker")

register_exception_handlers(app)
app.include_router(auth_router)
app.include_router(admin_user_router)
app.include_router(user_router)


if __name__ == "__main__":
    uvicorn.run(
        "main:app", host=settings.uvicorn_host, port=settings.uvicorn_port, reload=True
    )
