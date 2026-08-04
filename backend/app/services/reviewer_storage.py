import hashlib
import os
import uuid
from datetime import datetime, timezone

try:
    import boto3
except ImportError:
    boto3 = None

from boto3.dynamodb.conditions import Attr

from app.config import AWS_REGION

from app.services.sqlite_db import db_save_reviewer, db_get_reviewers, db_save_review, db_get_reviews

REVIEWERS_TABLE = os.getenv("REVIEWERS_TABLE", "raawa-reviewers")
REVIEWS_TABLE = os.getenv("REVIEWS_TABLE", "raawa-reviews")


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


def _get_table(table_name):
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
                KeySchema=[
                    {"AttributeName": "record_id", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "record_id", "AttributeType": "S"},
                    {"AttributeName": "created_at", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            return table
        except Exception as e:
            print(f"Error creating table {table_name}: {e}")
            raise


def _hash_password(password):
    return hashlib.sha256((password or "").encode("utf-8")).hexdigest()


def _public_reviewer(item):
    if not item:
        return None
    sanitized = dict(item)
    sanitized.pop("password_hash", None)
    return sanitized


def _reviewer_key(organization_id, email):
    return f"reviewer:{organization_id}:{_normalize_email(email)}"


def save_reviewer(reviewer_data):
    organization_id = (reviewer_data.get("organization_id") or "").strip()
    reviewer_email = _normalize_email(reviewer_data.get("email"))
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "record_id": _reviewer_key(organization_id, reviewer_email),
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

    if dynamodb_resource is None:
        db_save_reviewer(item)
        return _public_reviewer(item)

    table = _get_table(REVIEWERS_TABLE)
    table.put_item(Item=item)
    return _public_reviewer(item)


def authenticate_reviewer(email, password, organization_id=None):
    normalized_email = _normalize_email(email)
    password_hash = _hash_password(password)

    if dynamodb_resource is None:
        reviewers = db_get_reviewers()
        for item in reviewers:
            if item.get("email") == normalized_email and item.get("password_hash") == password_hash:
                if organization_id and item.get("organization_id") != organization_id:
                    continue
                return _public_reviewer(item)
        return None

    table = _get_table(REVIEWERS_TABLE)
    response = table.scan(
        FilterExpression=Attr("entity_type").eq("reviewer")
    )
    for item in response.get("Items", []):
        if item.get("email") == normalized_email and item.get("password_hash") == password_hash:
            if organization_id and item.get("organization_id") != organization_id:
                continue
            return _public_reviewer(item)
    return None


def get_reviewers(owner_email=None, organization_id=None):
    normalized_owner = _normalize_email(owner_email)
    normalized_org = (organization_id or "").strip()

    def _matches(item):
        if normalized_owner and _normalize_email(item.get("organization_owner_email")) != normalized_owner:
            return False
        if normalized_org and item.get("organization_id") != normalized_org:
            return False
        return True

    if dynamodb_resource is None:
        return [_public_reviewer(item) for item in db_get_reviewers() if _matches(item)]

    table = _get_table(REVIEWERS_TABLE)
    response = table.scan(
        FilterExpression=Attr("entity_type").eq("reviewer")
    )
    return [_public_reviewer(item) for item in response.get("Items", []) if _matches(item)]


def save_review(review_data):
    organization_id = (review_data.get("organization_id") or "").strip()
    reviewer_email = _normalize_email(review_data.get("reviewer_email"))
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "record_id": f"review:{review_data.get('simulation_id', '')}:{reviewer_email}:{uuid.uuid4()}",
        "created_at": now,
        "entity_type": "review",
        "simulation_id": review_data.get("simulation_id", ""),
        "organization_id": organization_id,
        "organization_name": review_data.get("organization_name", ""),
        "reviewer_email": reviewer_email,
        "reviewer_name": review_data.get("reviewer_name", ""),
        "rating": int(review_data.get("rating", 0)),
        "review_text": review_data.get("review_text", ""),
    }

    if dynamodb_resource is None:
        return db_save_review(item)

    table = _get_table(REVIEWS_TABLE)
    table.put_item(Item=item)
    return item


def get_reviews(simulation_id=None, reviewer_email=None, organization_id=None):
    normalized_email = _normalize_email(reviewer_email)
    normalized_org = (organization_id or "").strip()

    def _matches(item):
        if simulation_id and item.get("simulation_id") != simulation_id:
            return False
        if normalized_email and _normalize_email(item.get("reviewer_email")) != normalized_email:
            return False
        if normalized_org and item.get("organization_id") != normalized_org:
            return False
        return True

    if dynamodb_resource is None:
        return [item for item in db_get_reviews() if _matches(item)]

    table = _get_table(REVIEWS_TABLE)
    response = table.scan(
        FilterExpression=Attr("entity_type").eq("review")
    )
    return [item for item in response.get("Items", []) if _matches(item)]