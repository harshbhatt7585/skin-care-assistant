from fastapi import APIRouter, Depends, HTTPException

from database.firebase import init_firebase
from schema.scan import (
    GetScanRequest,
    GetScanResponse,
    GetUserScansRequest,
    GetUserScansResponse,
    DeleteScanRequest,
    DeleteScanResponse,
    StoreScanPayload,
    StoreScanResponse,
)

scan_router = APIRouter(prefix="/scan", tags=["scan"])
db = init_firebase()


@scan_router.get("/get-scan", response_model=GetScanResponse)
def get_scan(payload: GetScanRequest = Depends()) -> GetScanResponse:
    # Placeholder logic; implement Firestore query when schema is ready
    return GetScanResponse(scan={})


@scan_router.get("/get-user-scans", response_model=GetUserScansResponse)
def get_user_scans(payload: GetUserScansRequest = Depends()) -> GetUserScansResponse:
    if not payload.uid:
        raise HTTPException(status_code=400, detail="uid is required")

    query = db.collection("scans").where("uid", "==", payload.uid)
    snapshots = query.stream()
    scans = [snapshot.to_dict() | {"id": snapshot.id} for snapshot in snapshots]
    return GetUserScansResponse(scans=scans)


@scan_router.delete("/delete-scan", response_model=DeleteScanResponse)
def delete_scan(payload: DeleteScanRequest) -> DeleteScanResponse:
    # Placeholder—implement deletion when scan schema is finalized
    return DeleteScanResponse(success=True)


@scan_router.post("/store-scan", response_model=StoreScanResponse)
def store_scan(payload: StoreScanPayload) -> StoreScanResponse:
    # Placeholder—persist to Firestore when schema finalized
    return StoreScanResponse(success=True)
