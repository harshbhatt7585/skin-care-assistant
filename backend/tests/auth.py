import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from firebase_admin import auth as firebase_auth

from schema.auth import User, UserPersonal
from app import app
from routers import auth as auth_router


@pytest.mark.asyncio
async def test_register_new_user(monkeypatch):
    """Test registering a new user successfully."""

    class DummyDocSnapshot:
        """Mock for document snapshot returned by .get()"""
        def __init__(self, exists: bool):
            self.exists = exists

    class DummyDocRef:
        """Mock for document reference returned by .document()"""
        def __init__(self, exists: bool = False):
            self._exists = exists

        def get(self):
            return DummyDocSnapshot(self._exists)

        def set(self, data):
            return data

    class DummyCollection:
        """Mock for collection reference returned by .collection()"""
        def __init__(self, doc_ref: DummyDocRef):
            self._doc_ref = doc_ref

        def document(self, doc_id: str):
            return self._doc_ref

    # Create mock objects
    dummy_doc_ref = DummyDocRef(exists=False)
    dummy_collection = DummyCollection(dummy_doc_ref)

    # Monkeypatch the db.collection method
    monkeypatch.setattr(auth_router, "db", type("MockDB", (), {
        "collection": lambda self, name: dummy_collection
    })())

    # Monkeypatch firebase auth methods
    def mock_get_user(uid):
        raise firebase_auth.UserNotFoundError("User not found")

    def mock_create_user(uid, email, display_name):
        return type("MockUser", (), {"uid": uid})()

    monkeypatch.setattr(auth_router.auth, "get_user", mock_get_user)
    monkeypatch.setattr(auth_router.auth, "create_user", mock_create_user)
    monkeypatch.setattr(auth_router.auth, "UserNotFoundError", firebase_auth.UserNotFoundError)

    # Create test payload
    now = datetime.now()
    payload = User(
        personal=UserPersonal(
            email="test@test.com",
            name="Test User",
            uid="test_uid",
            gender="male",
            country="US",
        ),
        last_scanned=now,
        last_chat=now,
        created_at=now,
    )

    # Convert to JSON-serializable dict (datetime -> ISO string)
    payload_dict = payload.model_dump(mode="json")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/auth/register", json=payload_dict)
        assert response.status_code == 200
        assert response.json()["uid"] == "test_uid"
        assert response.json()["message"] == "User registered"
    
