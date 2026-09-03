import re
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

from app.services.dynamodb_service import get_table


def _normalize_email(value):
    return (value or "").strip().lower()


def _get_table():
    return get_table()


def save_organization(org_data):
    owner_email = _normalize_email(org_data.get("owner_email"))
    record_id = f"org:{owner_email}:{uuid.uuid4()}"
    item = {
        "PK": f"ORG#{owner_email}",
        "SK": f"ORG#{record_id}",
        "GSI1-PK": f"ORG#{record_id}",
        "GSI1-SK": "METADATA",
        "record_id": record_id,
        "created_at": datetime.utcnow().isoformat(),
        "entity_type": "organization",
        "owner_email": owner_email,
        "name": org_data.get("name", ""),
        "sector": org_data.get("sector", ""),
        "community": org_data.get("community", ""),
        "description": org_data.get("description", ""),
    }

    table = _get_table()
    table.put_item(Item=item)
    return item


def get_organizations(owner_email=None):
    table = _get_table()
    normalized_email = _normalize_email(owner_email)

    if normalized_email:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"ORG#{normalized_email}") & Key("SK").begins_with("ORG#")
        )
        return response.get("Items", [])
    else:
        response = table.scan(
            FilterExpression=Attr("entity_type").eq("organization")
        )
        return response.get("Items", [])


def save_payment_method(payment_data):
    owner_email = _normalize_email(payment_data.get("owner_email"))
    card_number = re.sub(r"\D", "", payment_data.get("card_number", ""))
    last4 = card_number[-4:] if card_number else ""
    record_id = f"payment:{owner_email}:{uuid.uuid4()}"

    item = {
        "PK": f"PM#{owner_email}",
        "SK": f"PM#{record_id}",
        "record_id": record_id,
        "created_at": datetime.utcnow().isoformat(),
        "entity_type": "payment_method",
        "owner_email": owner_email,
        "cardholder_name": payment_data.get("cardholder_name", ""),
        "brand": payment_data.get("brand", "Visa"),
        "expiry_month": payment_data.get("expiry_month", ""),
        "expiry_year": payment_data.get("expiry_year", ""),
        "last4": last4,
    }

    table = _get_table()
    table.put_item(Item=item)
    return item


def get_payment_methods(owner_email=None):
    table = _get_table()
    normalized_email = _normalize_email(owner_email)

    if normalized_email:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"PM#{normalized_email}") & Key("SK").begins_with("PM#")
        )
        return response.get("Items", [])
    else:
        response = table.scan(
            FilterExpression=Attr("entity_type").eq("payment_method")
        )
        return response.get("Items", [])
