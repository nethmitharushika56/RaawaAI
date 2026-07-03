from pydantic import BaseModel
from typing import Optional


class ReviewerRegistrationRequest(BaseModel):
    organization_id: str
    organization_name: str
    organization_owner_email: str
    name: str
    email: str
    password: str
    role: Optional[str] = "Reviewer"


class ReviewerLoginRequest(BaseModel):
    email: str
    password: str
    organization_id: Optional[str] = None


class ReviewerReviewRequest(BaseModel):
    simulation_id: str
    reviewer_email: str
    reviewer_name: str
    organization_id: str
    organization_name: str
    rating: int
    review_text: str