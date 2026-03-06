from fastapi import FastAPI
import uvicorn

from config import settings

app = FastAPI()


@app.get("/")
def read_root() -> dict:
    return {"message": "Hello from finance-tracker!"}


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.UVICORN_HOST, port=settings.UVICORN_PORT, reload=True)
