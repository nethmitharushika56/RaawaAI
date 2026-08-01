import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "raawa.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        name TEXT,
        password_hash TEXT,
        salt TEXT,
        company TEXT,
        job_title TEXT,
        phone TEXT,
        description TEXT,
        created_at TEXT
    )
    """)
    
    # Create sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        email TEXT,
        expires_at TEXT
    )
    """)
    
    # Create organizations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        record_id TEXT PRIMARY KEY,
        created_at TEXT,
        entity_type TEXT,
        owner_email TEXT,
        name TEXT,
        sector TEXT,
        community TEXT,
        description TEXT
    )
    """)
    
    # Create payment_methods
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_methods (
        record_id TEXT PRIMARY KEY,
        created_at TEXT,
        entity_type TEXT,
        owner_email TEXT,
        cardholder_name TEXT,
        brand TEXT,
        expiry_month TEXT,
        expiry_year TEXT,
        last4 TEXT
    )
    """)
    
    # Create profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        created_at TEXT,
        updated_at TEXT,
        owner_email TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        job_title TEXT,
        description TEXT,
        avatar TEXT
    )
    """)
    
    # Create simulations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulations (
        simulation_id TEXT PRIMARY KEY,
        created_at TEXT,
        concept TEXT,
        audience TEXT,
        backlash_score REAL,
        sample_posts TEXT,
        metadata TEXT
    )
    """)
    
    # Create refinements
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS refinements (
        simulation_id TEXT PRIMARY KEY,
        created_at TEXT,
        parent_simulation_id TEXT,
        policy TEXT,
        recommendations TEXT,
        metadata TEXT
    )
    """)
    
    # Create reports
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        simulation_id TEXT PRIMARY KEY,
        created_at TEXT,
        parent_simulation_id TEXT,
        title TEXT,
        content TEXT,
        metadata TEXT
    )
    """)
    
    # Create reviewers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviewers (
        record_id TEXT PRIMARY KEY,
        created_at TEXT,
        entity_type TEXT,
        organization_id TEXT,
        organization_name TEXT,
        organization_owner_email TEXT,
        name TEXT,
        email TEXT,
        password_hash TEXT,
        role TEXT,
        status TEXT
    )
    """)
    
    # Create reviews
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        record_id TEXT PRIMARY KEY,
        created_at TEXT,
        entity_type TEXT,
        simulation_id TEXT,
        organization_id TEXT,
        organization_name TEXT,
        reviewer_email TEXT,
        reviewer_name TEXT,
        rating INTEGER,
        review_text TEXT
    )
    """)
    
    # Check if avatar column exists in profiles table and add it if not
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN avatar TEXT")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

# Users Operations
def save_user(email, password_hash, salt, name="", company="", job_title="", phone="", description=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO users (email, name, password_hash, salt, company, job_title, phone, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (email.lower(), name, password_hash, salt, company, job_title, phone, description, created_at))
    conn.commit()
    conn.close()
    return get_user(email)

def get_user(email):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    conn.close()
    return dict(row) if row else None

# Sessions Operations
def create_session(token, email, expires_at):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, ?)
    """, (token, email.lower(), expires_at.isoformat()))
    conn.commit()
    conn.close()

def verify_session_token(token):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM sessions WHERE token = ?", (token,)).fetchone()
    conn.close()
    if not row:
        return None
    
    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        # clean expired session
        delete_session(token)
        return None
    
    return dict(row)

def delete_session(token):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

# Organizations
def db_save_organization(org):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO organizations (record_id, created_at, entity_type, owner_email, name, sector, community, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (org["record_id"], org["created_at"], org["entity_type"], org["owner_email"], org["name"], org["sector"], org["community"], org["description"]))
    conn.commit()
    conn.close()
    return org

def db_get_organizations(owner_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if owner_email:
        rows = cursor.execute("SELECT * FROM organizations WHERE LOWER(owner_email) = ?", (owner_email.lower(),)).fetchall()
    else:
        rows = cursor.execute("SELECT * FROM organizations").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Payment Methods
def db_save_payment_method(pm):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO payment_methods (record_id, created_at, entity_type, owner_email, cardholder_name, brand, expiry_month, expiry_year, last4)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pm["record_id"], pm["created_at"], pm["entity_type"], pm["owner_email"], pm["cardholder_name"], pm["brand"], pm["expiry_month"], pm["expiry_year"], pm["last4"]))
    conn.commit()
    conn.close()
    return pm

def db_get_payment_methods(owner_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if owner_email:
        rows = cursor.execute("SELECT * FROM payment_methods WHERE LOWER(owner_email) = ?", (owner_email.lower(),)).fetchall()
    else:
        rows = cursor.execute("SELECT * FROM payment_methods").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Profiles
def db_save_profile(profile):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO profiles (profile_id, created_at, updated_at, owner_email, name, email, phone, company, job_title, description, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (profile["profile_id"], profile["created_at"], profile["updated_at"], profile["owner_email"], profile["name"], profile["email"], profile["phone"], profile["company"], profile["job_title"], profile["description"], profile.get("avatar", "")))
    conn.commit()
    conn.close()
    return profile

def db_get_profile(owner_email):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM profiles WHERE LOWER(owner_email) = ?", (owner_email.lower(),)).fetchone()
    conn.close()
    return dict(row) if row else None

# Simulations
def db_save_simulation(simulation):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO simulations (simulation_id, created_at, concept, audience, backlash_score, sample_posts, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        simulation["simulation_id"],
        simulation["created_at"],
        simulation["concept"],
        json.dumps(simulation["audience"]),
        simulation["backlash_score"],
        json.dumps(simulation["sample_posts"]),
        json.dumps(simulation["metadata"])
    ))
    conn.commit()
    conn.close()
    return simulation

def db_get_simulation(simulation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM simulations WHERE simulation_id = ?", (simulation_id,)).fetchone()
    conn.close()
    if not row:
        return None
    res = dict(row)
    res["audience"] = json.loads(res["audience"])
    res["sample_posts"] = json.loads(res["sample_posts"])
    res["metadata"] = json.loads(res["metadata"])
    return res

def db_get_all_simulations():
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM simulations ORDER BY created_at DESC").fetchall()
    conn.close()
    out = []
    for r in rows:
        d = dict(r)
        d["audience"] = json.loads(d["audience"])
        d["sample_posts"] = json.loads(d["sample_posts"])
        d["metadata"] = json.loads(d["metadata"])
        out.append(d)
    return out

# Refinements
def db_save_refinement(ref):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO refinements (simulation_id, created_at, parent_simulation_id, policy, recommendations, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        ref["simulation_id"],
        ref["created_at"],
        ref["parent_simulation_id"],
        ref["policy"],
        ref["recommendations"],
        json.dumps(ref["metadata"])
    ))
    conn.commit()
    conn.close()
    return ref

# Reports
def db_save_report(rep):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO reports (simulation_id, created_at, parent_simulation_id, title, content, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        rep["simulation_id"],
        rep["created_at"],
        rep["parent_simulation_id"],
        rep["title"],
        rep["content"],
        json.dumps(rep["metadata"])
    ))
    conn.commit()
    conn.close()
    return rep

def db_get_report(simulation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute(
        "SELECT * FROM reports WHERE parent_simulation_id = ? OR simulation_id = ?",
        (simulation_id, f"{simulation_id}-report")
    ).fetchone()
    conn.close()
    if row:
        r = dict(row)
        if r.get("metadata"):
            try:
                r["metadata"] = json.loads(r["metadata"])
            except Exception:
                r["metadata"] = {}
        else:
            r["metadata"] = {}
        return r
    return None

# Reviewers
def db_save_reviewer(reviewer):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO reviewers (record_id, created_at, entity_type, organization_id, organization_name, organization_owner_email, name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        reviewer["record_id"],
        reviewer["created_at"],
        reviewer["entity_type"],
        reviewer["organization_id"],
        reviewer["organization_name"],
        reviewer["organization_owner_email"],
        reviewer["name"],
        reviewer["email"].lower(),
        reviewer["password_hash"],
        reviewer["role"],
        reviewer["status"]
    ))
    conn.commit()
    conn.close()
    return reviewer

def db_get_reviewers():
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM reviewers").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Reviews
def db_save_review(review):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO reviews (record_id, created_at, entity_type, simulation_id, organization_id, organization_name, reviewer_email, reviewer_name, rating, review_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        review["record_id"],
        review["created_at"],
        review["entity_type"],
        review["simulation_id"],
        review["organization_id"],
        review["organization_name"],
        review["reviewer_email"].lower(),
        review["reviewer_name"],
        review["rating"],
        review["review_text"]
    ))
    conn.commit()
    conn.close()
    return review

def db_get_reviews():
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM reviews").fetchall()
    conn.close()
    return [dict(r) for r in rows]
