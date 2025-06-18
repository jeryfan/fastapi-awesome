from fastapi import FastAPI
from app.api import auth


app = FastAPI()
app.include_router(auth.router,prefix="/api")

@app.get("/")
async def home():
    return "hello world"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
