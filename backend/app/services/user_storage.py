from datetime import datetime, timezone
from app.services.dynamodb_service import TABLE_NAME, dynamodb_resource, get_table


def _normalize_email(value):
    return (value or "").strip().lower()


def _get_table():
    return get_table()


def save_user(email, password_hash, salt, name="", company="", job_title="", phone="", description=""):
    normalized_email = _normalize_email(email)
    created_at = datetime.now(timezone.utc).isoformat()
    item = {
        "PK": f"USER#{normalized_email}",
        "SK": "METADATA",
        "email": normalized_email,
        "name": name,
        "password_hash": password_hash,
        "salt": salt,
        "company": company,
        "job_title": job_title,
        "phone": phone,
        "description": description,
        "created_at": created_at,
    }

    table = _get_table()
    table.put_item(Item=item)
    return item


def get_user(email):
    normalized_email = _normalize_email(email)
    if not normalized_email:
        return None

    table = _get_table()
    response = table.get_item(Key={"PK": f"USER#{normalized_email}", "SK": "METADATA"})
    return response.get("Item")


def create_session(token, email, expires_at):
    normalized_email = _normalize_email(email)
    item = {
        "PK": f"SESSION#{token}",
        "SK": "METADATA",
        "GSI1-PK": f"USER#{normalized_email}",
        "GSI1-SK": f"SESSION#{token}",
        "token": token,
        "email": normalized_email,
        "expires_at": expires_at.isoformat(),
    }

    table = _get_table()
    table.put_item(Item=item)


def verify_session_token(token):
    if not token:
        return None

    table = _get_table()
    response = table.get_item(Key={"PK": f"SESSION#{token}", "SK": "METADATA"})
    item = response.get("Item")
    if not item:
        return None

    expires_at = datetime.fromisoformat(item["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        delete_session(token)
        return None

    return item


def delete_session(token):
    if not token:
        return

    table = _get_table()
    table.delete_item(Key={"PK": f"SESSION#{token}", "SK": "METADATA"})
