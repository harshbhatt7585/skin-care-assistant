import fastapi 


store_router = fastapi.APIRouter()

@store_router.get("/")
async def get_store():
    return {"message": "Hello, World!"}