from fastapi import APIRouter, Depends, HTTPException

from database.firebase import init_firebase
from schema.scan import (
    GetScanRequest,
    GetScanResponse,
    GetUserScansRequest,
    GetUserScansResponse,
    DeleteScanRequest,
    DeleteScanResponse,
    StoreScanRequest,
    StoreScanResponse,
    Scan,
)

scan_router = APIRouter(prefix="/scan", tags=["scan"])
db = init_firebase()


def _snapshot_to_scan(snapshot) -> Scan:
    data = snapshot.to_dict() or {}
    return Scan(
        id=snapshot.id,
        uid=data.get("uid", ""),
        created_at=str(data.get("created_at", "")),
        updated_at=str(data.get("updated_at", "")),
        images=list(data.get("images", [])),
        analysis=data.get("analysis", ""),
        scores=dict(data.get("scores", {})),
    )


@scan_router.get("/get-scan", response_model=GetScanResponse)
def get_scan(payload: GetScanRequest = Depends()) -> GetScanResponse:
    doc = db.collection("scans").document(payload.scan_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Scan not found")
    return GetScanResponse(scan=_snapshot_to_scan(doc))


@scan_router.get("/get-user-scans", response_model=GetUserScansResponse)
def get_user_scans(payload: GetUserScansRequest = Depends()) -> GetUserScansResponse:
    if not payload.uid:
        raise HTTPException(status_code=400, detail="uid is required")

    query = db.collection("scans").where("uid", "==", payload.uid)
    snapshots = query.stream()
    scans = [_snapshot_to_scan(snapshot) for snapshot in snapshots]
    return GetUserScansResponse(scans=scans)


@scan_router.delete("/delete-scan", response_model=DeleteScanResponse)
def delete_scan(payload: DeleteScanRequest) -> DeleteScanResponse:
    doc_ref = db.collection("scans").document(payload.scan_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Scan not found")
    doc_ref.delete()
    return DeleteScanResponse(success=True)


@scan_router.post("/store-scan", response_model=StoreScanResponse)
def store_scan(payload: StoreScanRequest) -> StoreScanResponse:
    scan = payload.scan
    doc_ref = db.collection("scans").document(scan.id)
    doc_ref.set(scan.model_dump())
    return StoreScanResponse(success=True)
