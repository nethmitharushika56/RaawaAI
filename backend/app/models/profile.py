from pydantic import BaseModel
from typing import Optional


class ProfileRequest(BaseModel):
    owner_email: str
    name: str
    email: str
    phone: Optional[str] = ""
    company: Optional[str] = ""
    job_title: Optional[str] = ""
    description: Optional[str] = ""