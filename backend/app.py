import fastapi

from database.firebase import init_firebase
from routers.auth import auth_router
from routers.search import search_router

app = fastapi.FastAPI()


@app.on_event("startup")
def startup_event() -> None:
    init_firebase()


app.include_router(auth_router)
app.include_router(search_router)
