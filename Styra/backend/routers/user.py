from fastapi import APIRouter, HTTPException

from schema.auth import GetUser, InventoryItem, User

user_router = APIRouter(prefix="/user", tags=["user"])


@user_router.get("/user")
def get_user(payload: GetUser) -> User:
    mock_user = User(
        personal={
            "email": "demo@example.com",
            "name": "Demo User",
            "uid": payload.uid,
            "gender": None,
            "country": "us",
        },
        created_at="2023-01-01T00:00:00Z",
        inventory=[],
    )
    return mock_user


@user_router.post("/user/inventory")
def add_to_inventory(payload: InventoryItem) -> InventoryItem:
    if not payload.name:
        raise HTTPException(status_code=400, detail="Product name is required")
    return payload
