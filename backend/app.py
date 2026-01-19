from contextlib import asynccontextmanager

import fastapi

from database.firebase import init_firebase
from routers.auth import auth_router
from routers.search import search_router


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    init_firebase()
    yield


app = fastapi.FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(search_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
