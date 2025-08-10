from fastapi import FastAPI, HTTPException
from app.api import auth, files, task
from app.handlers import exception_handler


def config_router(app: FastAPI, prefix: str = "/api"):
    app.include_router(auth.router, prefix=prefix)
    app.include_router(files.router, prefix=prefix)
    app.include_router(task.router, prefix=prefix)


app = FastAPI()
config_router(app)


exception_handler.set_up(app)


@app.get("/")
async def home():
    return "hello world"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
