import fastapi

from database.firebase import init_firebase

app = fastapi.FastAPI()


# init firebase
init_firebase()




