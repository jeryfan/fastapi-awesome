from fastapi import FastAPI
from app.api import auth, files


def config_router(app: FastAPI, prefix: str = "/api"):
    app.include_router(auth.router, prefix=prefix)
    app.include_router(files.router, prefix=prefix)


app = FastAPI()
config_router(app)


@app.get("/")
async def home():
    return "hello world"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
