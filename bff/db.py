import sqlite3
import os

# Use app directory for database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bottle_amigo.db')

def get_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.isolation_level = None  # Autocommit mode
    return conn

def init_db():
    """Initialize the database with schema (creates tables if missing)."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if tables already exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if cursor.fetchone():
        conn.close()
        return

    # Create tables
    tables = [
        """CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          lat REAL,
          lng REAL,
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE staff_accounts (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('mama', 'bartender')),
          pin TEXT NOT NULL
        )""",
        """CREATE TABLE bottles (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          owner_user_id TEXT NOT NULL REFERENCES users(id),
          type TEXT NOT NULL,
          remaining_pct INTEGER DEFAULT 100 CHECK(remaining_pct >= 0 AND remaining_pct <= 100),
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE bottle_shares (
          id TEXT PRIMARY KEY,
          bottle_id TEXT NOT NULL REFERENCES bottles(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          owner_user_id TEXT NOT NULL REFERENCES users(id),
          shared_to_user_id TEXT NOT NULL REFERENCES users(id),
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          ended_at TEXT
        )""",
        """CREATE TABLE bottle_gifts (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          target_user_id TEXT NOT NULL REFERENCES users(id),
          bottle_id TEXT NOT NULL REFERENCES bottles(id),
          add_pct INTEGER NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'applied', 'canceled')),
          created_at TEXT DEFAULT (datetime('now')),
          applied_at TEXT
        )""",
        """CREATE TABLE amigos (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          requester_user_id TEXT NOT NULL REFERENCES users(id),
          target_user_id TEXT NOT NULL REFERENCES users(id),
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active')),
          created_at TEXT DEFAULT (datetime('now')),
          accepted_at TEXT
        )""",
        """CREATE TABLE check_ins (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          user_id TEXT NOT NULL REFERENCES users(id),
          notify_to_user_ids TEXT DEFAULT '[]',
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended')),
          created_at TEXT DEFAULT (datetime('now')),
          ended_at TEXT
        )""",
        """CREATE TABLE customer_memos (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          user_id TEXT NOT NULL REFERENCES users(id),
          author_staff_id TEXT NOT NULL REFERENCES staff_accounts(id),
          body TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE store_staff_shifts (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          date TEXT NOT NULL,
          staff_names TEXT DEFAULT '[]',
          message_of_the_day TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE store_posts (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          type TEXT NOT NULL CHECK(type IN ('event', 'memo', 'intro', 'message', 'staff')),
          title TEXT,
          body TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          type TEXT NOT NULL CHECK(type IN ('amigo_checkin', 'store_post', 'bottle_share', 'bottle_gift')),
          payload_json TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          read_at TEXT
        )"""
    ]

    for table_sql in tables:
        try:
            cursor.execute(table_sql)
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()

def migrate_db():
    """Migrate existing database with new columns and tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Add new columns to users table
    new_user_columns = [
        ('nickname', 'TEXT'),
        ('avatar_base64', 'TEXT'),
        ('birthday_month', 'INTEGER'),
        ('birthday_day', 'INTEGER'),
        ('birthday_public', 'INTEGER DEFAULT 0'),
        ('bio', 'TEXT')
    ]

    for col_name, col_type in new_user_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            # Column already exists
            pass

    # Add new columns to stores table
    try:
        cursor.execute("ALTER TABLE stores ADD COLUMN logo_base64 TEXT")
    except sqlite3.OperationalError:
        # Column already exists
        pass

    # Add capacity_ml and remaining_ml columns to bottles table
    bottle_ml_columns = [
        ('capacity_ml', 'INTEGER DEFAULT 750'),
        ('remaining_ml', 'INTEGER DEFAULT 750'),
    ]
    for col_name, col_type in bottle_ml_columns:
        try:
            cursor.execute(f"ALTER TABLE bottles ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    # Migrate existing bottles: set remaining_ml based on remaining_pct if remaining_ml is still default
    try:
        cursor.execute("""
            UPDATE bottles
            SET remaining_ml = CAST(remaining_pct * capacity_ml / 100.0 AS INTEGER)
            WHERE remaining_ml = capacity_ml AND remaining_pct < 100
        """)
    except sqlite3.OperationalError:
        pass

    # Add capacity_ml to bottle_history
    bottle_history_columns = [
        ('previous_ml', 'INTEGER'),
        ('new_ml', 'INTEGER'),
    ]
    for col_name, col_type in bottle_history_columns:
        try:
            cursor.execute(f"ALTER TABLE bottle_history ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    # Add add_ml to bottle_gifts
    try:
        cursor.execute("ALTER TABLE bottle_gifts ADD COLUMN add_ml INTEGER")
    except sqlite3.OperationalError:
        pass

    # Add new columns to staff_accounts table
    staff_columns = [
        ('last_login_at', 'TEXT'),
        ('is_active', 'INTEGER DEFAULT 1'),
    ]
    for col_name, col_type in staff_columns:
        try:
            cursor.execute(f"ALTER TABLE staff_accounts ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    # Add bottle_master_id to bottles table
    try:
        cursor.execute("ALTER TABLE bottles ADD COLUMN bottle_master_id TEXT")
    except sqlite3.OperationalError:
        pass

    # Add image_base64 to bottles table (for individual bottle image override)
    try:
        cursor.execute("ALTER TABLE bottles ADD COLUMN image_base64 TEXT")
    except sqlite3.OperationalError:
        pass

    # Create new tables
    tables = [
        """CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id TEXT PRIMARY KEY REFERENCES users(id),
          amigo_checkin_notify INTEGER DEFAULT 1,
          store_post_notify INTEGER DEFAULT 1
        )""",
        """CREATE TABLE IF NOT EXISTS bottle_history (
          id TEXT PRIMARY KEY,
          bottle_id TEXT NOT NULL REFERENCES bottles(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          staff_id TEXT NOT NULL REFERENCES staff_accounts(id),
          previous_pct INTEGER NOT NULL,
          new_pct INTEGER NOT NULL,
          change_type TEXT NOT NULL CHECK(change_type IN ('update', 'refill', 'gift')),
          created_at TEXT DEFAULT (datetime('now'))
        )""",
        """CREATE TABLE IF NOT EXISTS bottle_masters (
          id TEXT PRIMARY KEY,
          store_id TEXT NOT NULL REFERENCES stores(id),
          name TEXT NOT NULL,
          brand TEXT,
          variety TEXT,
          capacity_ml INTEGER NOT NULL DEFAULT 750,
          image_base64 TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )"""
    ]

    for table_sql in tables:
        try:
            cursor.execute(table_sql)
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    migrate_db()
    print(f"Database initialized at {DB_PATH}")
