
import os
from functools import lru_cache
from pathlib import Path


import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / '.env'

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
elif not os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY'):
    raise RuntimeError('No .env file found and FIREBASE_SERVICE_ACCOUNT_KEY is not set')


@lru_cache(maxsize=1)
def init_firebase():
    key_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if not key_path:
        raise RuntimeError('Set FIREBASE_SERVICE_ACCOUNT_KEY to your service account json path')

    cred = credentials.Certificate(key_path)
    options: dict[str, str] = {}
    bucket_name = os.environ.get('FIREBASE_STORAGE_BUCKET')
    if bucket_name:
        options['storageBucket'] = bucket_name

    try:
        firebase_admin.get_app()
    except ValueError:
        if options:
            firebase_admin.initialize_app(cred, options)
        else:
            firebase_admin.initialize_app(cred)

    return firestore.client()


if __name__ == "__main__":
    print(init_firebase())
