import os
import sqlite3
import json
import sys
from decimal import Decimal

try:
    import boto3
except ImportError:
    print("Error: 'boto3' is required to run the migration script. Please run 'pip install boto3'")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Path to the SQLite database
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BACKEND_DIR, "raawa.db")

print(f"SQLite DB Path: {DB_PATH}")
if not os.path.exists(DB_PATH):
    print(f"Error: SQLite database file not found at {DB_PATH}. Make sure RaawaAI has been run at least once.")
    sys.exit(1)


# Setup AWS/DynamoDB Client
def get_dynamodb_resource():
    endpoint_url = os.getenv("DYNAMODB_ENDPOINT")
    region_name = os.getenv("AWS_REGION", "ap-south-1")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if endpoint_url:
        print(f"Connecting to DynamoDB Local at {endpoint_url} (Region: {region_name})")
        return boto3.resource(
            "dynamodb",
            region_name=region_name,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key or "dummy",
            aws_secret_access_key=secret_key or "dummy"
        )
    
    if access_key and secret_key:
        print(f"Connecting to AWS DynamoDB in region {region_name}")
        return boto3.resource(
            "dynamodb",
            region_name=region_name,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
    
    # Try default credentials
    print(f"Attempting connection to AWS DynamoDB in region {region_name} using default credentials")
    return boto3.resource("dynamodb", region_name=region_name)


try:
    ddb_resource = get_dynamodb_resource()
except Exception as e:
    print(f"Failed to connect to DynamoDB: {e}")
    sys.exit(1)


def create_single_table_if_not_exists(table_name):
    try:
        table = ddb_resource.Table(table_name)
        table.load()
        print(f"Single Table '{table_name}' already exists.")
        return table
    except Exception:
        print(f"Creating Single Table '{table_name}' with GSI1...")
        try:
            table = ddb_resource.create_table(
                TableName=table_name,
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
                BillingMode="PAY_PER_REQUEST"
            )
            table.wait_until_exists()
            print(f"Table '{table_name}' created successfully.")
            return table
        except Exception as e:
            print(f"Error creating single table '{table_name}': {e}")
            raise


def migrate_data(conn, table):
    cursor = conn.cursor()

    # Helpers
    def try_fetch(query):
        try:
            cursor.execute(query)
            return cursor.fetchall()
        except sqlite3.OperationalError as e:
            print(f"Operational error executing query '{query}': {e}. Skipping table.")
            return []

    # 1. Users
    user_rows = try_fetch("SELECT * FROM users")
    if user_rows:
        print(f"Migrating {len(user_rows)} users...")
        with table.batch_writer() as batch:
            for row in user_rows:
                r = dict(row)
                email = (r["email"] or "").strip().lower()
                item = {
                    "PK": f"USER#{email}",
                    "SK": "METADATA",
                    "email": email,
                    "name": r.get("name") or "",
                    "password_hash": r.get("password_hash") or "",
                    "salt": r.get("salt") or "",
                    "company": r.get("company") or "",
                    "job_title": r.get("job_title") or "",
                    "phone": r.get("phone") or "",
                    "description": r.get("description") or "",
                    "created_at": r.get("created_at") or ""
                }
                batch.put_item(Item=item)

    # 2. Sessions
    session_rows = try_fetch("SELECT * FROM sessions")
    if session_rows:
        print(f"Migrating {len(session_rows)} sessions...")
        with table.batch_writer() as batch:
            for row in session_rows:
                r = dict(row)
                email = (r["email"] or "").strip().lower()
                token = r["token"]
                item = {
                    "PK": f"SESSION#{token}",
                    "SK": "METADATA",
                    "GSI1-PK": f"USER#{email}",
                    "GSI1-SK": f"SESSION#{token}",
                    "token": token,
                    "email": email,
                    "expires_at": r.get("expires_at") or ""
                }
                batch.put_item(Item=item)

    # 3. Profiles
    profile_rows = try_fetch("SELECT * FROM profiles")
    if profile_rows:
        print(f"Migrating {len(profile_rows)} profiles...")
        with table.batch_writer() as batch:
            for row in profile_rows:
                r = dict(row)
                owner_email = (r["owner_email"] or "").strip().lower()
                item = {
                    "PK": f"USER#{owner_email}",
                    "SK": "PROFILE",
                    "profile_id": owner_email,
                    "owner_email": owner_email,
                    "name": r.get("name") or "",
                    "email": (r.get("email") or owner_email).strip().lower(),
                    "phone": r.get("phone") or "",
                    "company": r.get("company") or "",
                    "job_title": r.get("job_title") or "",
                    "description": r.get("description") or "",
                    "avatar": r.get("avatar") or "",
                    "created_at": r.get("created_at") or "",
                    "updated_at": r.get("updated_at") or ""
                }
                batch.put_item(Item=item)

    # 4. Organizations
    org_rows = try_fetch("SELECT * FROM organizations")
    if org_rows:
        print(f"Migrating {len(org_rows)} organizations...")
        with table.batch_writer() as batch:
            for row in org_rows:
                r = dict(row)
                owner_email = (r["owner_email"] or "").strip().lower()
                record_id = r["record_id"]
                item = {
                    "PK": f"ORG#{owner_email}",
                    "SK": f"ORG#{record_id}",
                    "GSI1-PK": f"ORG#{record_id}",
                    "GSI1-SK": "METADATA",
                    "record_id": record_id,
                    "entity_type": "organization",
                    "owner_email": owner_email,
                    "name": r.get("name") or "",
                    "sector": r.get("sector") or "",
                    "community": r.get("community") or "",
                    "description": r.get("description") or "",
                    "created_at": r.get("created_at") or ""
                }
                batch.put_item(Item=item)

    # 5. Payment Methods
    pm_rows = try_fetch("SELECT * FROM payment_methods")
    if pm_rows:
        print(f"Migrating {len(pm_rows)} payment methods...")
        with table.batch_writer() as batch:
            for row in pm_rows:
                r = dict(row)
                owner_email = (r["owner_email"] or "").strip().lower()
                record_id = r["record_id"]
                item = {
                    "PK": f"PM#{owner_email}",
                    "SK": f"PM#{record_id}",
                    "record_id": record_id,
                    "entity_type": "payment_method",
                    "owner_email": owner_email,
                    "cardholder_name": r.get("cardholder_name") or "",
                    "brand": r.get("brand") or "Visa",
                    "expiry_month": r.get("expiry_month") or "",
                    "expiry_year": r.get("expiry_year") or "",
                    "last4": r.get("last4") or "",
                    "created_at": r.get("created_at") or ""
                }
                batch.put_item(Item=item)

    # 6. Reviewers
    reviewer_rows = try_fetch("SELECT * FROM reviewers")
    if reviewer_rows:
        print(f"Migrating {len(reviewer_rows)} reviewers...")
        with table.batch_writer() as batch:
            for row in reviewer_rows:
                r = dict(row)
                org_id = (r.get("organization_id") or "").strip()
                email = (r.get("email") or "").strip().lower()
                item = {
                    "PK": f"ORG#{org_id}",
                    "SK": f"REVIEWER#{email}",
                    "GSI1-PK": f"REVIEWER#{email}",
                    "GSI1-SK": f"ORG#{org_id}",
                    "record_id": r.get("record_id") or f"reviewer:{org_id}:{email}",
                    "entity_type": "reviewer",
                    "organization_id": org_id,
                    "organization_name": r.get("organization_name") or "",
                    "organization_owner_email": (r.get("organization_owner_email") or "").strip().lower(),
                    "name": r.get("name") or "",
                    "email": email,
                    "password_hash": r.get("password_hash") or "",
                    "role": r.get("role") or "Reviewer",
                    "status": r.get("status") or "active",
                    "created_at": r.get("created_at") or ""
                }
                batch.put_item(Item=item)

    # 7. Reviews
    review_rows = try_fetch("SELECT * FROM reviews")
    if review_rows:
        print(f"Migrating {len(review_rows)} reviews...")
        with table.batch_writer() as batch:
            for row in review_rows:
                r = dict(row)
                sim_id = r.get("simulation_id") or ""
                reviewer_email = (r.get("reviewer_email") or "").strip().lower()
                org_id = r.get("organization_id") or ""
                item = {
                    "PK": f"SIM#{sim_id}",
                    "SK": f"REVIEW#{reviewer_email}",
                    "GSI1-PK": f"ORG#{org_id}",
                    "GSI1-SK": f"REVIEW#{sim_id}",
                    "record_id": r.get("record_id") or f"review:{sim_id}:{reviewer_email}",
                    "entity_type": "review",
                    "simulation_id": sim_id,
                    "organization_id": org_id,
                    "organization_name": r.get("organization_name") or "",
                    "reviewer_email": reviewer_email,
                    "reviewer_name": r.get("reviewer_name") or "",
                    "rating": int(r.get("rating") or 0),
                    "review_text": r.get("review_text") or "",
                    "created_at": r.get("created_at") or ""
                }
                batch.put_item(Item=item)

    # 8. Simulations
    sim_rows = try_fetch("SELECT * FROM simulations")
    if sim_rows:
        print(f"Migrating {len(sim_rows)} simulations...")
        with table.batch_writer() as batch:
            for row in sim_rows:
                r = dict(row)
                sim_id = r["simulation_id"]
                created_at = r.get("created_at") or ""
                
                # Parse JSON fields
                audience = {}
                sample_posts = []
                metadata = {}
                try:
                    if r.get("audience"):
                        audience = json.loads(r["audience"])
                except Exception:
                    pass
                try:
                    if r.get("sample_posts"):
                        sample_posts = json.loads(r["sample_posts"])
                except Exception:
                    pass
                try:
                    if r.get("metadata"):
                        metadata = json.loads(r["metadata"])
                except Exception:
                    pass
                
                item = {
                    "PK": f"SIM#{sim_id}",
                    "SK": "METADATA",
                    "GSI1-PK": "ALL_SIMULATIONS",
                    "GSI1-SK": created_at,
                    "simulation_id": sim_id,
                    "created_at": created_at,
                    "concept": r.get("concept") or "",
                    "backlash_score": Decimal(str(r.get("backlash_score") or 0.0)),
                    "audience": audience,
                    "sample_posts": sample_posts,
                    "metadata": metadata
                }
                batch.put_item(Item=item)

    # 9. Refinements
    ref_rows = try_fetch("SELECT * FROM refinements")
    if ref_rows:
        print(f"Migrating {len(ref_rows)} refinements...")
        with table.batch_writer() as batch:
            for row in ref_rows:
                r = dict(row)
                sim_id = r["simulation_id"] # contains -refinement usually
                parent_id = r.get("parent_simulation_id") or ""
                
                metadata = {}
                try:
                    if r.get("metadata"):
                        metadata = json.loads(r["metadata"])
                except Exception:
                    pass
                    
                item = {
                    "PK": f"SIM#{parent_id}",
                    "SK": f"REFINEMENT#{sim_id}",
                    "simulation_id": sim_id,
                    "parent_simulation_id": parent_id,
                    "created_at": r.get("created_at") or "",
                    "policy": r.get("policy") or "",
                    "recommendations": r.get("recommendations") or "",
                    "metadata": metadata
                }
                batch.put_item(Item=item)

    # 10. Reports
    rep_rows = try_fetch("SELECT * FROM reports")
    if rep_rows:
        print(f"Migrating {len(rep_rows)} reports...")
        with table.batch_writer() as batch:
            for row in rep_rows:
                r = dict(row)
                sim_id = r["simulation_id"] # contains -report usually
                parent_id = r.get("parent_simulation_id") or ""
                
                metadata = {}
                try:
                    if r.get("metadata"):
                        metadata = json.loads(r["metadata"])
                except Exception:
                    pass
                    
                item = {
                    "PK": f"SIM#{parent_id}",
                    "SK": f"REPORT#{sim_id}",
                    "simulation_id": sim_id,
                    "parent_simulation_id": parent_id,
                    "created_at": r.get("created_at") or "",
                    "title": r.get("title") or "",
                    "content": r.get("content") or "",
                    "metadata": metadata
                }
                batch.put_item(Item=item)


def main():
    print("Starting database migration from SQLite to Single-Table DynamoDB...")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    table_name = os.getenv("DYNAMODB_TABLE", "raawa-data")
    table = create_single_table_if_not_exists(table_name)
    
    migrate_data(conn, table)
    
    conn.close()
    print("Database migration finished successfully!")


if __name__ == "__main__":
    main()
