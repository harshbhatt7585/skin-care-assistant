from contextlib import asynccontextmanager

import fastapi
from fastapi.middleware.cors import CORSMiddleware

from database.firebase import init_firebase
from routers.auth import auth_router
from routers.search import search_router
from routers.chat import chat_router


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    init_firebase()
    yield


app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(search_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
