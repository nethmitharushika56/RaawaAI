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