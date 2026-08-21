import os
from datetime import datetime, timezone

try:
    import boto3
except ImportError:
    boto3 = None

from app.config import AWS_REGION
from app.services.sqlite_db import (
    save_user as db_save_user,
    get_user as db_get_user,
    create_session as db_create_session,
    verify_session_token as db_verify_session_token,
    delete_session as db_delete_session,
)

USERS_TABLE = os.getenv("USERS_TABLE", "raawa-users")
SESSIONS_TABLE = os.getenv("SESSIONS_TABLE", "raawa-sessions")


def _normalize_email(value):
    return (value or "").strip().lower()


def _create_resource():
    if boto3 is None:
        return None

    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if os.getenv("DYNAMODB_ENDPOINT"):
        return boto3.resource(
            "dynamodb",
            region_name=os.getenv("AWS_REGION", AWS_REGION),
            endpoint_url=os.getenv("DYNAMODB_ENDPOINT"),
            aws_access_key_id=access_key or "dummy",
            aws_secret_access_key=secret_key or "dummy",
        )

    if not access_key or not secret_key:
        return None

    return boto3.resource(
        "dynamodb",
        region_name=os.getenv("AWS_REGION", AWS_REGION),
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


dynamodb_resource = _create_resource()


def _get_table(table_name, key_name):
    if dynamodb_resource is None:
        return None

    try:
        table = dynamodb_resource.Table(table_name)
        table.load()
        return table
    except Exception:
        try:
            table = dynamodb_resource.create_table(
                TableName=table_name,
                KeySchema=[{"AttributeName": key_name, "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": key_name, "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            return table
        except Exception as e:
            print(f"Error creating table {table_name}: {e}")
            raise


def save_user(email, password_hash, salt, name="", company="", job_title="", phone="", description=""):
    normalized_email = _normalize_email(email)
    created_at = datetime.now(timezone.utc).isoformat()
    item = {
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

    if dynamodb_resource is None:
        return db_save_user(email, password_hash, salt, name, company, job_title, phone, description)

    table = _get_table(USERS_TABLE, "email")
    table.put_item(Item=item)
    return item


def get_user(email):
    normalized_email = _normalize_email(email)
    if not normalized_email:
        return None

    if dynamodb_resource is None:
        return db_get_user(normalized_email)

    table = _get_table(USERS_TABLE, "email")
    response = table.get_item(Key={"email": normalized_email})
    return response.get("Item")


def create_session(token, email, expires_at):
    normalized_email = _normalize_email(email)
    item = {
        "token": token,
        "email": normalized_email,
        "expires_at": expires_at.isoformat(),
    }

    if dynamodb_resource is None:
        return db_create_session(token, email, expires_at)

    table = _get_table(SESSIONS_TABLE, "token")
    table.put_item(Item=item)


def verify_session_token(token):
    if not token:
        return None

    if dynamodb_resource is None:
        return db_verify_session_token(token)

    table = _get_table(SESSIONS_TABLE, "token")
    response = table.get_item(Key={"token": token})
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

    if dynamodb_resource is None:
        return db_delete_session(token)

    table = _get_table(SESSIONS_TABLE, "token")
    table.delete_item(Key={"token": token})
