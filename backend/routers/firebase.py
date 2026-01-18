import fastapi
import firebase_admin
from firebase_admin import credentials, storage, auth
import os
from dotenv import load_dotenv

if os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    raise RuntimeError("No .env file found")



firebase_router = fastapi.APIRouter()


def init_firebase():
    key_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not key_path:
        raise RuntimeError("Set FIREBASE_SERVICE_ACCOUNT_KEY to your service account json path")

    cred = credentials.Certificate(key_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    return db
