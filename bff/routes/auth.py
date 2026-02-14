import uuid
import json
import hashlib
import os
from bff.db import get_connection
from bff.middleware.auth import generate_token

def hash_password(password):
    """Hash a password using hashlib with salt."""
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password, stored):
    """Verify a password against its hash."""
    try:
        salt, hashed = stored.split(':')
        return hashlib.sha256((salt + password).encode()).hexdigest() == hashed
    except (ValueError, AttributeError):
        return False

def user_register(self, body):
    """POST /auth/user/register - Register a new user."""
    required = ['email', 'password']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    name = body.get('name', '')
    email = body['email']
    password = body['password']

    # Optional profile fields
    nickname = body.get('nickname')
    avatar_base64 = body.get('avatarBase64')
    birthday_month = body.get('birthdayMonth')
    birthday_day = body.get('birthdayDay')
    birthday_public = body.get('birthdayPublic', 0)
    bio = body.get('bio')

    conn = get_connection()
    cursor = conn.cursor()

    # Check if email already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Email already exists'}).encode())
        return

    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(password)

    cursor.execute("""
        INSERT INTO users (id, name, email, password, nickname, avatar_base64, birthday_month, birthday_day, birthday_public, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, name, email, hashed_password, nickname, avatar_base64, birthday_month, birthday_day, birthday_public, bio))

    # Create default notification settings
    cursor.execute("""
        INSERT INTO user_notification_settings (user_id, amigo_checkin_notify, store_post_notify)
        VALUES (?, 1, 1)
    """, (user_id,))

    conn.commit()

    # Generate token
    token = generate_token({'userId': user_id, 'type': 'user'})

    user_data = {
        'id': user_id,
        'name': name,
        'email': email,
        'nickname': nickname,
        'avatarBase64': avatar_base64,
        'birthdayMonth': birthday_month,
        'birthdayDay': birthday_day,
        'birthdayPublic': birthday_public,
        'bio': bio,
        'notificationSettings': {
            'amigoCheckinNotify': 1,
            'storePostNotify': 1
        }
    }

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'token': token,
        'user': user_data
    }).encode())

    conn.close()

def user_login(self, body):
    """POST /auth/user/login - Login a user."""
    required = ['email', 'password']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    email = body['email']
    password = body['password']

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, email, password FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()

    if not user_row or not verify_password(password, user_row['password']):
        conn.close()
        self.send_response(401)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Invalid email or password'}).encode())
        return

    # Generate token
    token = generate_token({'userId': user_row['id'], 'type': 'user'})

    user_data = {
        'id': user_row['id'],
        'name': user_row['name'],
        'email': user_row['email']
    }

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'token': token,
        'user': user_data
    }).encode())

    conn.close()

def staff_login(self, body):
    """POST /auth/staff/login - Login as staff."""
    required = ['storeId', 'pin']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    pin = body['pin']

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, role, is_active FROM staff_accounts
        WHERE store_id = ? AND pin = ?
    """, (store_id, pin))
    staff_row = cursor.fetchone()

    if not staff_row:
        conn.close()
        self.send_response(401)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Invalid store or PIN'}).encode())
        return

    # Check if account is disabled
    if staff_row['is_active'] is not None and staff_row['is_active'] == 0:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'このアカウントは無効化されています'}).encode())
        return

    # Update last login time
    cursor.execute("""
        UPDATE staff_accounts SET last_login_at = datetime('now') WHERE id = ?
    """, (staff_row['id'],))
    conn.commit()

    # Generate token
    token = generate_token({
        'staffId': staff_row['id'],
        'storeId': store_id,
        'role': staff_row['role'],
        'type': 'staff'
    })

    staff_data = {
        'id': staff_row['id'],
        'name': staff_row['name'],
        'role': staff_row['role'],
        'storeId': store_id
    }

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'token': token,
        'staff': staff_data
    }).encode())

    conn.close()
