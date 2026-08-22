import os
from datetime import datetime, timezone
import boto3

from app.config import AWS_REGION

TABLE_NAME = os.getenv("DYNAMODB_TABLE", "raawa-data")


def _normalize_email(value):
    return (value or "").strip().lower()


def _create_resource():
    region = os.getenv("AWS_REGION", AWS_REGION)
    endpoint = os.getenv("DYNAMODB_ENDPOINT")

    if endpoint:
        return boto3.resource(
            "dynamodb",
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "dummy"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "dummy"),
        )

    return boto3.resource(
        "dynamodb",
        region_name=region,
    )


dynamodb_resource = _create_resource()


def _get_table():
    try:
        table = dynamodb_resource.Table(TABLE_NAME)
        table.load()
        return table
    except Exception:
        # Fallback table creation (useful for local development/testing)
        try:
            table = dynamodb_resource.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {"AttributeName": "PK", "KeyType": "HASH"},
                    {"AttributeName": "SK", "KeyType": "RANGE"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "PK", "AttributeType": "S"},
                    {"AttributeName": "SK", "AttributeType": "S"},
                    {"AttributeName": "GSI1-PK", "AttributeType": "S"},
                    {"AttributeName": "GSI1-SK", "AttributeType": "S"}
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "GSI1",
                        "KeySchema": [
                            {"AttributeName": "GSI1-PK", "KeyType": "HASH"},
                            {"AttributeName": "GSI1-SK", "KeyType": "RANGE"}
                        ],
                        "Projection": {
                            "ProjectionType": "ALL"
                        }
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            return table
        except Exception as e:
            print(f"Error creating table {TABLE_NAME}: {e}")
            raise


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
