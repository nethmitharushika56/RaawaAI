import sqlite3
import os

db_path = r"c:\Users\gamag\OneDrive\Desktop\My projects\RaawaAI\backend\raawa.db"

if not os.path.exists(db_path):
    print(f"Database file not found at: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get list of tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row['name'] for row in cursor.fetchall()]

print("=" * 60)
print(f"RawaaAI SQLite Database Inspector")
print(f"Location: {db_path}")
print(f"File Size: {os.path.getsize(db_path)} bytes")
print("=" * 60)

for table in tables:
    print(f"\nTable: {table}")
    
    # Get count
    cursor.execute(f"SELECT COUNT(*) as count FROM {table};")
    count = cursor.fetchone()['count']
    print(f"  Total Records: {count}")
    
    # Get column names and types
    cursor.execute(f"PRAGMA table_info({table});")
    columns = cursor.fetchall()
    print("  Columns:")
    for col in columns:
        print(f"    - {col['name']} ({col['type']}) {'[PK]' if col['pk'] else ''}")
        
    # Get sample data
    if count > 0:
        cursor.execute(f"SELECT * FROM {table} LIMIT 2;")
        rows = cursor.fetchall()
        print("  Sample Data (up to 2 rows):")
        for i, row in enumerate(rows):
            print(f"    Row {i+1}:")
            for key in row.keys():
                val = str(row[key])
                if len(val) > 100:
                    val = val[:100] + "..."
                print(f"      {key}: {val}")
    print("-" * 60)

conn.close()
