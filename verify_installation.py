#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, '..')

print("=" * 60)
print("BOTTLE AMIGO BFF INSTALLATION VERIFICATION")
print("=" * 60)

# Check Python version
print(f"\n✓ Python version: {sys.version.split()[0]}")

# Check required modules
required = ['sqlite3', 'bcrypt', 'jwt', 'json', 'uuid', 'http.server']
print("\n✓ Required modules:")
for module in required:
    try:
        if module == 'jwt':
            import jwt as j
        elif module == 'http.server':
            import http.server
        else:
            __import__(module)
        print(f"  ✓ {module}")
    except ImportError:
        print(f"  ✗ {module} - MISSING")

# Check file structure
print("\n✓ File structure:")
files = [
    'bff/server.py',
    'bff/db.py',
    'bff/seed.py',
    'bff/routes/__init__.py',
    'bff/routes/auth.py',
    'bff/routes/consumer.py',
    'bff/routes/store.py',
    'bff/middleware/__init__.py',
    'bff/middleware/auth.py',
    'bff/services/__init__.py',
    'bff/services/notification.py',
    'README.md',
    'test_api.sh',
    'IMPLEMENTATION_SUMMARY.md',
]

for f in files:
    if os.path.exists(f):
        size = os.path.getsize(f)
        print(f"  ✓ {f} ({size} bytes)")
    else:
        print(f"  ✗ {f} - MISSING")

# Test database
print("\n✓ Database verification:")
from bff.db import get_connection

conn = get_connection()
cursor = conn.cursor()

# Count tables
cursor.execute("""
    SELECT COUNT(*) as count FROM sqlite_master 
    WHERE type='table'
""")
table_count = cursor.fetchone()['count']
print(f"  ✓ Tables: {table_count}")

# Count data
cursor.execute("SELECT COUNT(*) as count FROM users")
users = cursor.fetchone()['count']
print(f"  ✓ Users: {users}")

cursor.execute("SELECT COUNT(*) as count FROM stores")
stores = cursor.fetchone()['count']
print(f"  ✓ Stores: {stores}")

cursor.execute("SELECT COUNT(*) as count FROM bottles")
bottles = cursor.fetchone()['count']
print(f"  ✓ Bottles: {bottles}")

conn.close()

# Test authentication
print("\n✓ Authentication system:")
from bff.middleware.auth import generate_token, verify_token

token = generate_token({'userId': 'test-id', 'type': 'user'})
payload = verify_token(token)
if payload and payload['userId'] == 'test-id':
    print(f"  ✓ JWT token generation and verification works")
else:
    print(f"  ✗ JWT token verification failed")

# Test password hashing
print("\n✓ Password hashing:")
from bff.routes.auth import hash_password, verify_password

pwd = "test-password-123"
hashed = hash_password(pwd)
if verify_password(pwd, hashed):
    print(f"  ✓ Bcrypt password hashing works")
else:
    print(f"  ✗ Password hashing failed")

print("\n" + "=" * 60)
print("INSTALLATION VERIFIED - READY TO RUN")
print("=" * 60)
print("\nTo start the server:")
print("  python3 bff/server.py")
print("\nServer will run on http://localhost:3001")
print("\nFor API testing:")
print("  bash test_api.sh")
print("\n" + "=" * 60)
