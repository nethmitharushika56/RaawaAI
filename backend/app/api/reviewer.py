from fastapi import APIRouter, HTTPException, Query

from app.models.reviewer import ReviewerLoginRequest, ReviewerRegistrationRequest, ReviewerReviewRequest
from app.services.reviewer_storage import (
    authenticate_reviewer,
    get_reviews,
    get_reviewers,
    save_reviewer,
    save_review,
)

router = APIRouter()


@router.post("/reviewers/register")
def register_reviewer(req: ReviewerRegistrationRequest):
    reviewer = save_reviewer(req.model_dump())
    return {"reviewer": reviewer}


@router.post("/reviewers/login")
def login_reviewer(req: ReviewerLoginRequest):
    reviewer = authenticate_reviewer(req.email, req.password, req.organization_id)
    if not reviewer:
        raise HTTPException(status_code=401, detail="Invalid reviewer credentials")
    return {"reviewer": reviewer}


@router.get("/reviewers")
def list_reviewers(owner_email: str = Query(default=""), organization_id: str = Query(default="")):
    reviewers = get_reviewers(owner_email=owner_email, organization_id=organization_id)
    return {"reviewers": reviewers, "count": len(reviewers)}


@router.post("/reviews")
def add_review(req: ReviewerReviewRequest):
    review = save_review(req.model_dump())
    return {"review": review}


@router.get("/reviews")
def list_reviews(
    simulation_id: str = Query(default=""),
    reviewer_email: str = Query(default=""),
    organization_id: str = Query(default=""),
):
    reviews = get_reviews(
        simulation_id=simulation_id,
        reviewer_email=reviewer_email,
        organization_id=organization_id,
    )
    return {"reviews": reviews, "count": len(reviews)}