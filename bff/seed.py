import uuid
import json
from datetime import datetime
import hashlib
import os
from bff.db import get_connection, init_db

def hash_password(password):
    """Hash a password using hashlib with salt."""
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def seed_data():
    """Seed the database with demo data."""
    init_db()

    conn = get_connection()
    cursor = conn.cursor()

    # Create store
    store_id = "bar-sakura-001"
    cursor.execute("""
        INSERT INTO stores (id, name, address, lat, lng)
        VALUES (?, ?, ?, ?, ?)
    """, (
        store_id,
        "Bar Hassy",
        "東京都渋谷区道玄坂2-10-7",
        35.6595,
        139.7004
    ))

    # Create staff accounts
    mama_id = str(uuid.uuid4())
    bartender_id = str(uuid.uuid4())

    cursor.execute("""
        INSERT INTO staff_accounts (id, store_id, name, role, pin)
        VALUES (?, ?, ?, ?, ?)
    """, (mama_id, store_id, "はっしーママ", "mama", "1234"))

    cursor.execute("""
        INSERT INTO staff_accounts (id, store_id, name, role, pin)
        VALUES (?, ?, ?, ?, ?)
    """, (bartender_id, store_id, "タカシ", "bartender", "5678"))

    # Create users
    tanaka_id = str(uuid.uuid4())
    suzuki_id = str(uuid.uuid4())
    sato_id = str(uuid.uuid4())

    cursor.execute("""
        INSERT INTO users (id, name, email, password)
        VALUES (?, ?, ?, ?)
    """, (tanaka_id, "田中太郎", "tanaka@example.com", hash_password("password123")))

    cursor.execute("""
        INSERT INTO users (id, name, email, password)
        VALUES (?, ?, ?, ?)
    """, (suzuki_id, "鈴木花子", "suzuki@example.com", hash_password("password123")))

    cursor.execute("""
        INSERT INTO users (id, name, email, password)
        VALUES (?, ?, ?, ?)
    """, (sato_id, "佐藤健一", "sato@example.com", hash_password("password123")))

    # Create bottles
    bottle1_id = str(uuid.uuid4())
    bottle2_id = str(uuid.uuid4())

    cursor.execute("""
        INSERT INTO bottles (id, store_id, owner_user_id, type, remaining_pct)
        VALUES (?, ?, ?, ?, ?)
    """, (bottle1_id, store_id, tanaka_id, "焼酎", 60))

    cursor.execute("""
        INSERT INTO bottles (id, store_id, owner_user_id, type, remaining_pct)
        VALUES (?, ?, ?, ?, ?)
    """, (bottle2_id, store_id, suzuki_id, "ウイスキー", 80))

    # Create amigo relationship (active)
    amigo_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO amigos (id, store_id, requester_user_id, target_user_id, status, accepted_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (amigo_id, store_id, tanaka_id, suzuki_id, "active"))

    # Create today's shift
    shift_id = str(uuid.uuid4())
    staff_names = json.dumps(["はっしーママ", "タカシ"])
    cursor.execute("""
        INSERT INTO store_staff_shifts (id, store_id, date, staff_names, message_of_the_day)
        VALUES (?, ?, date('now'), ?, ?)
    """, (shift_id, store_id, staff_names, "今日も元気に営業中！"))

    conn.commit()
    conn.close()

    print("Database seeded with demo data!")
    print(f"Store ID: {store_id}")
    print(f"Users: {tanaka_id}, {suzuki_id}, {sato_id}")
    print(f"Bottles: {bottle1_id}, {bottle2_id}")

if __name__ == '__main__':
    seed_data()
