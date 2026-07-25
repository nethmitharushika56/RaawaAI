import os
from datetime import datetime, timezone

try:
    import boto3
except ImportError:
    boto3 = None

from app.config import AWS_REGION

from app.services.sqlite_db import db_save_profile, db_get_profile

PROFILES_TABLE = os.getenv("PROFILES_TABLE", "raawa-profiles")


def _normalize_email(value):
    return (value or "").strip().lower()


def _create_resource():
    if boto3 is None:
        return None

    if os.getenv("DYNAMODB_ENDPOINT"):
        return boto3.resource(
            "dynamodb",
            region_name=os.getenv("AWS_REGION", AWS_REGION),
            endpoint_url=os.getenv("DYNAMODB_ENDPOINT"),
        )

    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    if not access_key or not secret_key:
        return None

    return boto3.resource(
        "dynamodb",
        region_name=os.getenv("AWS_REGION", AWS_REGION),
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


dynamodb_resource = _create_resource()


def _get_table():
    if dynamodb_resource is None:
        return None

    try:
        table = dynamodb_resource.Table(PROFILES_TABLE)
        table.load()
        return table
    except Exception:
        try:
            table = dynamodb_resource.create_table(
                TableName=PROFILES_TABLE,
                KeySchema=[{"AttributeName": "profile_id", "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": "profile_id", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            return table
        except Exception as e:
            print(f"Error creating table {PROFILES_TABLE}: {e}")
            raise


def _build_profile_item(profile_data):
    owner_email = _normalize_email(profile_data.get("owner_email"))
    email = _normalize_email(profile_data.get("email")) or owner_email
    now = datetime.now(timezone.utc).isoformat()

    return {
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
    }


def save_profile(profile_data):
    item = _build_profile_item(profile_data)

    if dynamodb_resource is None:
        return db_save_profile(item)

    table = _get_table()
    table.put_item(Item=item)
    return item


def get_profile(owner_email):
    normalized_email = _normalize_email(owner_email)
    if not normalized_email:
        return None

    if dynamodb_resource is None:
        return db_get_profile(normalized_email)

    table = _get_table()
    response = table.get_item(Key={"profile_id": normalized_email})
    return response.get("Item")