from fastapi import APIRouter
from schema.search import (
    SearchVectorDBRequest,
    SearchVectorDBResponse,
    UploadVectorDBRequest,
    UploadVectorDBResponse,
)
from utils.search import (
    search_vector_db as search_vector_db_util,
    upload_documents as upload_documents_util,
)
from llm.gemini import get_gemini_embedding
from fastapi import HTTPException

search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.post("/search-vector-db")
async def search_vector_db(payload: SearchVectorDBRequest):
    query = payload.query
    uid = payload.uid
    timestamp = payload.timestamp

    embedding = get_gemini_embedding(query)

    results = search_vector_db_util(embedding, uid, timestamp)
    return SearchVectorDBResponse(results=results)


@search_router.post("/upload-vector-db")
async def upload_vector_db(payload: UploadVectorDBRequest):
    uid = payload.uid
    content = payload.content
    timestamp = payload.timestamp

    embedding = get_gemini_embedding(content)

    try:
        response = upload_documents_util(uid, content, embedding, timestamp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return UploadVectorDBResponse(message=response)
