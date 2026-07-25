import os
import re
import uuid
from datetime import datetime

try:
    import boto3
except ImportError:
    boto3 = None

from boto3.dynamodb.conditions import Attr

from app.config import AWS_REGION

from app.services.sqlite_db import db_save_organization, db_get_organizations, db_save_payment_method, db_get_payment_methods

ORGANIZATIONS_TABLE = os.getenv("ORGANIZATIONS_TABLE", "raawa-organizations")
PAYMENT_METHODS_TABLE = os.getenv("PAYMENT_METHODS_TABLE", "raawa-payment-methods")


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


def _filter_items(items, owner_email=None):
    normalized_email = _normalize_email(owner_email)
    if normalized_email:
        return [item for item in items if _normalize_email(item.get("owner_email")) == normalized_email]
    return list(items)


def save_organization(org_data):
    owner_email = _normalize_email(org_data.get("owner_email"))
    item = {
        "record_id": f"org:{owner_email}:{uuid.uuid4()}",
        "created_at": datetime.utcnow().isoformat(),
        "entity_type": "organization",
        "owner_email": owner_email,
        "name": org_data.get("name", ""),
        "sector": org_data.get("sector", ""),
        "community": org_data.get("community", ""),
        "description": org_data.get("description", ""),
    }

    if dynamodb_resource is None:
        return db_save_organization(item)

    table = _get_table(ORGANIZATIONS_TABLE)
    table.put_item(Item=item)
    return item


def get_organizations(owner_email=None):
    if dynamodb_resource is None:
        return db_get_organizations(owner_email)

    table = _get_table(ORGANIZATIONS_TABLE)
    response = table.scan(
        FilterExpression=Attr("entity_type").eq("organization")
    )
    items = response.get("Items", [])
    return _filter_items(items, owner_email)


def save_payment_method(payment_data):
    owner_email = _normalize_email(payment_data.get("owner_email"))
    card_number = re.sub(r"\D", "", payment_data.get("card_number", ""))
    last4 = card_number[-4:] if card_number else ""

    item = {
        "record_id": f"payment:{owner_email}:{uuid.uuid4()}",
        "created_at": datetime.utcnow().isoformat(),
        "entity_type": "payment_method",
        "owner_email": owner_email,
        "cardholder_name": payment_data.get("cardholder_name", ""),
        "brand": payment_data.get("brand", "Visa"),
        "expiry_month": payment_data.get("expiry_month", ""),
        "expiry_year": payment_data.get("expiry_year", ""),
        "last4": last4,
    }

    if dynamodb_resource is None:
        return db_save_payment_method(item)

    table = _get_table(PAYMENT_METHODS_TABLE)
    table.put_item(Item=item)
    return item


def get_payment_methods(owner_email=None):
    if dynamodb_resource is None:
        return db_get_payment_methods(owner_email)

    table = _get_table(PAYMENT_METHODS_TABLE)
    response = table.scan(
        FilterExpression=Attr("entity_type").eq("payment_method")
    )
    items = response.get("Items", [])
    return _filter_items(items, owner_email)
