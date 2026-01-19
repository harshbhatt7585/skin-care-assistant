from fastapi import APIRouter
from schema.search import SearchVectorDBRequest, SearchVectorDBResponse
from utils.search import search_vector_db as search_vector_db_util

search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.post("/search-vector-db")
async def search_vector_db(payload: SearchVectorDBRequest):
    query = payload.query
    uid = payload.uid
    timestamp = payload.timestamp

    results = search_vector_db_util(query, uid, timestamp)
    return SearchVectorDBResponse(results=results)
