import os
import sqlite3
import json
import sys
from decimal import Decimal
from datetime import datetime

try:
    import boto3
except ImportError:
    print("Error: 'boto3' is required to run the migration script. Please run 'pip install boto3'")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If dotenv is not installed, we assume environment variables are set directly
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
    
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    
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


def create_table_if_not_exists(table_name, key_schema, attr_definitions):
    try:
        table = ddb_resource.Table(table_name)
        table.load()
        print(f"Table '{table_name}' already exists.")
        return table
    except Exception:
        print(f"Creating table '{table_name}'...")
        try:
            table = ddb_resource.create_table(
                TableName=table_name,
                KeySchema=key_schema,
                AttributeDefinitions=attr_definitions,
                BillingMode="PAY_PER_REQUEST"
            )
            table.wait_until_exists()
            print(f"Table '{table_name}' created successfully.")
            return table
        except Exception as e:
            print(f"Error creating table '{table_name}': {e}")
            raise


def migrate_simple_table(conn, sqlite_table, ddb_table_name, key_schema, attr_definitions):
    table = create_table_if_not_exists(ddb_table_name, key_schema, attr_definitions)
    
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT * FROM {sqlite_table}")
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        print(f"SQLite table '{sqlite_table}' does not exist or has no rows to migrate. Skipping.")
        return

    if not rows:
        print(f"No records found in SQLite table '{sqlite_table}'. Skipping.")
        return

    print(f"Migrating {len(rows)} records from SQLite '{sqlite_table}' to DynamoDB '{ddb_table_name}'...")
    
    count = 0
    with table.batch_writer() as batch:
        for row in rows:
            item = dict(row)
            # Remove keys with None values if preferred, or boto3 will map them to Null
            # Let's keep them as DynamoDB handles Null well
            batch.put_item(Item=item)
            count += 1
            
    print(f"Successfully migrated {count} records from '{sqlite_table}' to '{ddb_table_name}'.")


def migrate_simulations_combined(conn, ddb_table_name, key_schema, attr_definitions):
    table = create_table_if_not_exists(ddb_table_name, key_schema, attr_definitions)
    cursor = conn.cursor()
    
    # 1. Migrate Simulations
    try:
        cursor.execute("SELECT * FROM simulations")
        sim_rows = cursor.fetchall()
    except sqlite3.OperationalError:
        sim_rows = []
        print("SQLite table 'simulations' does not exist. Skipping simulations migration.")

    if sim_rows:
        print(f"Migrating {len(sim_rows)} simulations to '{ddb_table_name}'...")
        count = 0
        with table.batch_writer() as batch:
            for row in sim_rows:
                row_dict = dict(row)
                item = {
                    "simulation_id": row_dict["simulation_id"],
                    "created_at": row_dict["created_at"],
                    "concept": row_dict.get("concept", ""),
                    "audience": json.loads(row_dict["audience"]) if row_dict.get("audience") else {},
                    "backlash_score": Decimal(str(row_dict["backlash_score"])) if row_dict.get("backlash_score") is not None else Decimal("0"),
                    "sample_posts": json.loads(row_dict["sample_posts"]) if row_dict.get("sample_posts") else [],
                    "metadata": json.loads(row_dict["metadata"]) if row_dict.get("metadata") else {}
                }
                batch.put_item(Item=item)
                count += 1
        print(f"Migrated {count} simulation records.")

    # 2. Migrate Refinements
    try:
        cursor.execute("SELECT * FROM refinements")
        ref_rows = cursor.fetchall()
    except sqlite3.OperationalError:
        ref_rows = []
        print("SQLite table 'refinements' does not exist. Skipping refinements migration.")

    if ref_rows:
        print(f"Migrating {len(ref_rows)} refinements to '{ddb_table_name}'...")
        count = 0
        with table.batch_writer() as batch:
            for row in ref_rows:
                row_dict = dict(row)
                item = {
                    "simulation_id": row_dict["simulation_id"], # f"{simulation_id}-refinement"
                    "created_at": row_dict["created_at"],
                    "parent_simulation_id": row_dict.get("parent_simulation_id", ""),
                    "policy": row_dict.get("policy", ""),
                    "recommendations": row_dict.get("recommendations", ""),
                    "metadata": json.loads(row_dict["metadata"]) if row_dict.get("metadata") else {}
                }
                batch.put_item(Item=item)
                count += 1
        print(f"Migrated {count} refinement records.")

    # 3. Migrate Reports
    try:
        cursor.execute("SELECT * FROM reports")
        rep_rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rep_rows = []
        print("SQLite table 'reports' does not exist. Skipping reports migration.")

    if rep_rows:
        print(f"Migrating {len(rep_rows)} reports to '{ddb_table_name}'...")
        count = 0
        with table.batch_writer() as batch:
            for row in rep_rows:
                row_dict = dict(row)
                item = {
                    "simulation_id": row_dict["simulation_id"], # f"{simulation_id}-report"
                    "created_at": row_dict["created_at"],
                    "parent_simulation_id": row_dict.get("parent_simulation_id", ""),
                    "title": row_dict.get("title", ""),
                    "content": row_dict.get("content", ""),
                    "metadata": json.loads(row_dict["metadata"]) if row_dict.get("metadata") else {}
                }
                batch.put_item(Item=item)
                count += 1
        print(f"Migrated {count} report records.")


def main():
    print("Starting database migration from SQLite to DynamoDB...")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Define Table schemas and env variable mappings
    tables_to_migrate = [
        # Users
        {
            "sqlite_table": "users",
            "ddb_table": os.getenv("USERS_TABLE", "raawa-users"),
            "key_schema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "attr_definitions": [{"AttributeName": "email", "AttributeType": "S"}]
        },
        # Sessions
        {
            "sqlite_table": "sessions",
            "ddb_table": os.getenv("SESSIONS_TABLE", "raawa-sessions"),
            "key_schema": [{"AttributeName": "token", "KeyType": "HASH"}],
            "attr_definitions": [{"AttributeName": "token", "AttributeType": "S"}]
        },
        # Organizations
        {
            "sqlite_table": "organizations",
            "ddb_table": os.getenv("ORGANIZATIONS_TABLE", "raawa-organizations"),
            "key_schema": [
                {"AttributeName": "record_id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"}
            ],
            "attr_definitions": [
                {"AttributeName": "record_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"}
            ]
        },
        # Payment Methods
        {
            "sqlite_table": "payment_methods",
            "ddb_table": os.getenv("PAYMENT_METHODS_TABLE", "raawa-payment-methods"),
            "key_schema": [
                {"AttributeName": "record_id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"}
            ],
            "attr_definitions": [
                {"AttributeName": "record_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"}
            ]
        },
        # Profiles
        {
            "sqlite_table": "profiles",
            "ddb_table": os.getenv("PROFILES_TABLE", "raawa-profiles"),
            "key_schema": [{"AttributeName": "profile_id", "KeyType": "HASH"}],
            "attr_definitions": [{"AttributeName": "profile_id", "AttributeType": "S"}]
        },
        # Reviewers
        {
            "sqlite_table": "reviewers",
            "ddb_table": os.getenv("REVIEWERS_TABLE", "raawa-reviewers"),
            "key_schema": [
                {"AttributeName": "record_id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"}
            ],
            "attr_definitions": [
                {"AttributeName": "record_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"}
            ]
        },
        # Reviews
        {
            "sqlite_table": "reviews",
            "ddb_table": os.getenv("REVIEWS_TABLE", "raawa-reviews"),
            "key_schema": [
                {"AttributeName": "record_id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"}
            ],
            "attr_definitions": [
                {"AttributeName": "record_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"}
            ]
        }
    ]
    
    # 1. Migrate simple tables
    for config in tables_to_migrate:
        migrate_simple_table(
            conn, 
            config["sqlite_table"], 
            config["ddb_table"], 
            config["key_schema"], 
            config["attr_definitions"]
        )
        
    # 2. Migrate simulations-related tables (combined)
    simulations_table_name = os.getenv("DYNAMODB_TABLE", "raawa-simulations")
    simulations_key_schema = [
        {"AttributeName": "simulation_id", "KeyType": "HASH"},
        {"AttributeName": "created_at", "KeyType": "RANGE"}
    ]
    simulations_attr_defs = [
        {"AttributeName": "simulation_id", "AttributeType": "S"},
        {"AttributeName": "created_at", "AttributeType": "S"}
    ]
    migrate_simulations_combined(conn, simulations_table_name, simulations_key_schema, simulations_attr_defs)
    
    conn.close()
    print("Database migration finished successfully!")


if __name__ == "__main__":
    main()
