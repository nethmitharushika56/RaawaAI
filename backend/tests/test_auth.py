from fastapi.testclient import TestClient
import pytest
import os
from app.main import app
from app.services.sqlite_db import get_db_connection, init_db
from app.services.user_storage import dynamodb_resource, TABLE_NAME
try:
    from boto3.dynamodb.conditions import Key
except ImportError:
    Key = None

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    # Ensure SQLite tables exist and clean them
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = 'testuser@raawa.ai'")
    cursor.execute("DELETE FROM sessions WHERE email = 'testuser@raawa.ai'")
    conn.commit()
    conn.close()
    
    # Clean DynamoDB if configured
    if dynamodb_resource is not None:
        try:
            table = dynamodb_resource.Table(TABLE_NAME)
            table.delete_item(Key={"PK": "USER#testuser@raawa.ai", "SK": "METADATA"})
        except Exception:
            pass
        if Key is not None:
            try:
                response = table.query(
                    IndexName="GSI1",
                    KeyConditionExpression=Key("GSI1-PK").eq("USER#testuser@raawa.ai")
                )
                for item in response.get("Items", []):
                    table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
            except Exception:
                pass
    yield

def test_signup_and_login_flow():
    # 1. Sign up a new user
    signup_data = {
        "email": "testuser@raawa.ai",
        "password": "SecurePassword123",
        "name": "Test User",
        "company": "Raawa Corp",
        "job_title": "Developer"
    }
    signup_resp = client.post("/api/auth/signup", json=signup_data)
    assert signup_resp.status_code == 200
    signup_body = signup_resp.json()
    assert "token" in signup_body
    assert signup_body["user"]["email"] == "testuser@raawa.ai"
    assert signup_body["user"]["name"] == "Test User"
    
    token = signup_body["token"]
    
    # 2. Get current user profile (using session token)
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == "testuser@raawa.ai"
    
    # 3. Log in with the registered credentials
    login_data = {
        "email": "testuser@raawa.ai",
        "password": "SecurePassword123"
    }
    login_resp = client.post("/api/auth/login", json=login_data)
    assert login_resp.status_code == 200
    login_body = login_resp.json()
    assert "token" in login_body
    
    # 4. Attempt access with an invalid token
    bad_me_resp = client.get("/api/auth/me", headers={"Authorization": "Bearer badtoken"})
    assert bad_me_resp.status_code == 401
