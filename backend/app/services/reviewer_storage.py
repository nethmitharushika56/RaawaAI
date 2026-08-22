import hashlib
import os
import uuid
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key, Attr

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


def _hash_password(password):
    return hashlib.sha256((password or "").encode("utf-8")).hexdigest()


def _public_reviewer(item):
    if not item:
        return None
    sanitized = dict(item)
    sanitized.pop("password_hash", None)
    return sanitized


def save_reviewer(reviewer_data):
    organization_id = (reviewer_data.get("organization_id") or "").strip()
    reviewer_email = _normalize_email(reviewer_data.get("email"))
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "PK": f"ORG#{organization_id}",
        "SK": f"REVIEWER#{reviewer_email}",
        "GSI1-PK": f"REVIEWER#{reviewer_email}",
        "GSI1-SK": f"ORG#{organization_id}",
        "record_id": f"reviewer:{organization_id}:{reviewer_email}",
        "created_at": now,
        "entity_type": "reviewer",
        "organization_id": organization_id,
        "organization_name": reviewer_data.get("organization_name", ""),
        "organization_owner_email": _normalize_email(reviewer_data.get("organization_owner_email")),
        "name": reviewer_data.get("name", ""),
        "email": reviewer_email,
        "password_hash": _hash_password(reviewer_data.get("password", "")),
        "role": reviewer_data.get("role", "Reviewer"),
        "status": "active",
    }

    table = _get_table()
    table.put_item(Item=item)
    return _public_reviewer(item)


def authenticate_reviewer(email, password, organization_id=None):
    normalized_email = _normalize_email(email)
    password_hash = _hash_password(password)

    table = _get_table()
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1-PK").eq(f"REVIEWER#{normalized_email}")
    )
    for item in response.get("Items", []):
        if item.get("password_hash") == password_hash:
            if organization_id and item.get("organization_id") != organization_id:
                continue
            return _public_reviewer(item)
    return None


def get_reviewers(owner_email=None, organization_id=None):
    normalized_owner = _normalize_email(owner_email)
    normalized_org = (organization_id or "").strip()

    table = _get_table()

    if normalized_org:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"ORG#{normalized_org}") & Key("SK").begins_with("REVIEWER#")
        )
        items = response.get("Items", [])
        if normalized_owner:
            items = [i for i in items if _normalize_email(i.get("organization_owner_email")) == normalized_owner]
        return [_public_reviewer(item) for item in items]

    elif normalized_owner:
        org_response = table.query(
            KeyConditionExpression=Key("PK").eq(f"ORG#{normalized_owner}") & Key("SK").begins_with("ORG#")
        )
        org_ids = [item.get("record_id") for item in org_response.get("Items", [])]
        
        items = []
        for org_id in org_ids:
            if org_id:
                rev_response = table.query(
                    KeyConditionExpression=Key("PK").eq(f"ORG#{org_id}") & Key("SK").begins_with("REVIEWER#")
                )
                items.extend(rev_response.get("Items", []))
        return [_public_reviewer(item) for item in items]

    else:
        response = table.scan(
            FilterExpression=Attr("entity_type").eq("reviewer")
        )
        return [_public_reviewer(item) for item in response.get("Items", [])]


def save_review(review_data):
    organization_id = (review_data.get("organization_id") or "").strip()
    reviewer_email = _normalize_email(review_data.get("reviewer_email"))
    simulation_id = review_data.get("simulation_id", "")
    now = datetime.now(timezone.utc).isoformat()
    record_id = f"review:{simulation_id}:{reviewer_email}:{uuid.uuid4()}"

    item = {
        "PK": f"SIM#{simulation_id}",
        "SK": f"REVIEW#{reviewer_email}",
        "GSI1-PK": f"ORG#{organization_id}",
        "GSI1-SK": f"REVIEW#{simulation_id}",
        "record_id": record_id,
        "created_at": now,
        "entity_type": "review",
        "simulation_id": simulation_id,
        "organization_id": organization_id,
        "organization_name": review_data.get("organization_name", ""),
        "reviewer_email": reviewer_email,
        "reviewer_name": review_data.get("reviewer_name", ""),
        "rating": int(review_data.get("rating", 0)),
        "review_text": review_data.get("review_text", ""),
    }

    table = _get_table()
    table.put_item(Item=item)
    return item


def get_reviews(simulation_id=None, reviewer_email=None, organization_id=None):
    normalized_email = _normalize_email(reviewer_email)
    normalized_org = (organization_id or "").strip()

    table = _get_table()

    if simulation_id:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"SIM#{simulation_id}") & Key("SK").begins_with("REVIEW#")
        )
        items = response.get("Items", [])
        if normalized_email:
            items = [item for item in items if _normalize_email(item.get("reviewer_email")) == normalized_email]
        if normalized_org:
            items = [item for item in items if item.get("organization_id") == normalized_org]
        return items

    elif normalized_org:
        response = table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1-PK").eq(f"ORG#{normalized_org}") & Key("GSI1-SK").begins_with("REVIEW#")
        )
        items = response.get("Items", [])
        if normalized_email:
            items = [item for item in items if _normalize_email(item.get("reviewer_email")) == normalized_email]
        return items

    elif normalized_email:
        response = table.scan(
            FilterExpression=Attr("entity_type").eq("review") & Attr("reviewer_email").eq(normalized_email)
        )
        return response.get("Items", [])

    else:
        response = table.scan(
            FilterExpression=Attr("entity_type").eq("review")
        )
        return response.get("Items", [])