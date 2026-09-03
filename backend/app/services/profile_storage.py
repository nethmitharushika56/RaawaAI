from datetime import datetime, timezone
from app.services.dynamodb_service import get_table


def _normalize_email(value):
    return (value or "").strip().lower()


def _get_table():
    return get_table()


def _build_profile_item(profile_data):
    owner_email = _normalize_email(profile_data.get("owner_email"))
    email = _normalize_email(profile_data.get("email")) or owner_email
    now = datetime.now(timezone.utc).isoformat()

    return {
        "PK": f"USER#{owner_email}",
        "SK": "PROFILE",
        "profile_id": owner_email,
        "created_at": now,
        "updated_at": now,
        "owner_email": owner_email,
        "name": profile_data.get("name", ""),
        "email": email,
        "phone": profile_data.get("phone", ""),
        "company": profile_data.get("company", ""),
        "job_title": profile_data.get("job_title", ""),
        "description": profile_data.get("description", ""),
        "avatar": profile_data.get("avatar", ""),
    }


def save_profile(profile_data):
    item = _build_profile_item(profile_data)
    table = _get_table()
    table.put_item(Item=item)
    return item


def get_profile(owner_email):
    normalized_email = _normalize_email(owner_email)
    if not normalized_email:
        return None

    table = _get_table()
    response = table.get_item(Key={"PK": f"USER#{normalized_email}", "SK": "PROFILE"})
    return response.get("Item")