from fastapi import APIRouter

search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.get("/search")
async def search(query: str):
    return {"message": "Hello, World!"}
