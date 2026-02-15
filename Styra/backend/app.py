from contextlib import asynccontextmanager

import fastapi
from fastapi.middleware.cors import CORSMiddleware

from database.firebase import init_firebase
from routers.auth import auth_router
from routers.search import search_router
from routers.chat import chat_router
from routers.agent import agent_router
from routers.user import user_router
from routers.scan import scan_router


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    init_firebase()
    yield


app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(search_router)
app.include_router(chat_router)
app.include_router(agent_router)
app.include_router(user_router)
app.include_router(scan_router)


if __name__ == "__main__":
    import os
    import uvicorn

    reload_enabled = os.environ.get("UVICORN_RELOAD") == "1"
    if reload_enabled:
        uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
    else:
        default_workers = 4
        workers = int(os.environ.get("UVICORN_WORKERS", default_workers))
        uvicorn.run("app:app", host="0.0.0.0", port=8000, workers=workers)
