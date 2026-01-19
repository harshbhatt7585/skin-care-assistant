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
