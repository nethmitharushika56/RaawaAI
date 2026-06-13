from fastapi import APIRouter, Query

from app.models.profile import ProfileRequest
from app.services.profile_storage import get_profile, save_profile

router = APIRouter()


@router.get("/profile")
def read_profile(owner_email: str = Query(default="")):
    profile = get_profile(owner_email)
    return {"profile": profile}


@router.post("/profile")
def upsert_profile(req: ProfileRequest):
    profile = save_profile(req.model_dump())
    return {"profile": profile}