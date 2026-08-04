from fastapi.testclient import TestClient
import pytest
import os
from app.main import app
from app.services.sqlite_db import get_db_connection, init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    # Ensure tables exist
    init_db()
    # Clean up test user before and after tests
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = 'testuser@raawa.ai'")
    cursor.execute("DELETE FROM sessions WHERE email = 'testuser@raawa.ai'")
    conn.commit()
    conn.close()
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
