#!/bin/bash
# Bottle Amigo - 一括起動スクリプト
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🍶 Bottle Amigo MVP を起動します..."
echo ""

# Check python3
if ! command -v python3 &> /dev/null; then
    echo "❌ python3 が見つかりません。"
    echo "   xcode-select --install を実行してください"
    exit 1
fi

echo "✅ Python3: $(python3 --version)"

# Kill existing processes
pkill -f "python3 bff/server.py" 2>/dev/null
pkill -f "python3 -m http.server 300" 2>/dev/null
sleep 1

# === データベースの確認・修復 ===
cd "$SCRIPT_DIR"
DB_FILE="$SCRIPT_DIR/bottle_amigo.db"

python3 << 'PYEOF'
import sqlite3
import sys
import os
import hashlib
import uuid
import json

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd(), 'bottle_amigo.db')

def hash_password(password):
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

needs_reset = False

# Check if DB exists and has correct data
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT id FROM stores WHERE id = 'bar-sakura-001'")
        row = c.fetchone()
        if row:
            print("✅ データベース確認OK (bar-sakura-001)")
            conn.close()
            sys.exit(0)
        else:
            print("⚠️  店舗データが古い形式です。リセットします...")
            needs_reset = True
            conn.close()
    except Exception as e:
        print(f"⚠️  データベースに問題があります: {e}")
        needs_reset = True
else:
    print("📦 データベースを新規作成します...")
    needs_reset = True

# Delete old DB
if needs_reset and os.path.exists(db_path):
    try:
        os.remove(db_path)
    except:
        pass

# Create fresh DB
conn = sqlite3.connect(db_path)
conn.execute("PRAGMA journal_mode=WAL")
c = conn.cursor()

# Create tables
tables = [
    """CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL,
      lat REAL, lng REAL, created_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS staff_accounts (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, name TEXT NOT NULL,
      role TEXT NOT NULL, pin TEXT NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, owner_user_id TEXT NOT NULL,
      type TEXT NOT NULL, remaining_pct INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS bottle_shares (
      id TEXT PRIMARY KEY, bottle_id TEXT NOT NULL, store_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL, shared_to_user_id TEXT NOT NULL,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), ended_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS bottle_gifts (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, target_user_id TEXT NOT NULL,
      bottle_id TEXT NOT NULL, add_pct INTEGER NOT NULL, reason TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled', created_at TEXT DEFAULT (datetime('now')), applied_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS amigos (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, requester_user_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')), accepted_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, user_id TEXT NOT NULL,
      notify_to_user_ids TEXT DEFAULT '[]', status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')), ended_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS customer_memos (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, user_id TEXT NOT NULL,
      author_staff_id TEXT NOT NULL, body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS store_staff_shifts (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL, date TEXT NOT NULL,
      staff_names TEXT DEFAULT '[]', message_of_the_day TEXT,
      created_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS store_posts (
      id TEXT PRIMARY KEY, store_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('event', 'memo', 'intro', 'message', 'staff')),
      title TEXT, body TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))""",
    """CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
      payload_json TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')), read_at TEXT)""",
]

for sql in tables:
    c.execute(sql)

# Seed data
store_id = "bar-sakura-001"
c.execute("INSERT INTO stores VALUES (?,?,?,?,?,datetime('now'))",
    (store_id, "Bar Hassy", "東京都渋谷区道玄坂2-10-7", 35.6595, 139.7004))

mama_id = str(uuid.uuid4())
bart_id = str(uuid.uuid4())
c.execute("INSERT INTO staff_accounts VALUES (?,?,?,?,?)", (mama_id, store_id, "はっしーママ", "mama", "1234"))
c.execute("INSERT INTO staff_accounts VALUES (?,?,?,?,?)", (bart_id, store_id, "タカシ", "bartender", "5678"))

tanaka_id = str(uuid.uuid4())
suzuki_id = str(uuid.uuid4())
sato_id = str(uuid.uuid4())
c.execute("INSERT INTO users VALUES (?,?,?,?,datetime('now'))", (tanaka_id, "田中太郎", "tanaka@example.com", hash_password("password123")))
c.execute("INSERT INTO users VALUES (?,?,?,?,datetime('now'))", (suzuki_id, "鈴木花子", "suzuki@example.com", hash_password("password123")))
c.execute("INSERT INTO users VALUES (?,?,?,?,datetime('now'))", (sato_id, "佐藤健一", "sato@example.com", hash_password("password123")))

b1 = str(uuid.uuid4())
b2 = str(uuid.uuid4())
c.execute("INSERT INTO bottles VALUES (?,?,?,?,?,datetime('now'),datetime('now'))", (b1, store_id, tanaka_id, "焼酎", 60))
c.execute("INSERT INTO bottles VALUES (?,?,?,?,?,datetime('now'),datetime('now'))", (b2, store_id, suzuki_id, "ウイスキー", 80))

amigo_id = str(uuid.uuid4())
c.execute("INSERT INTO amigos VALUES (?,?,?,?,?,datetime('now'),datetime('now'))", (amigo_id, store_id, tanaka_id, suzuki_id, "active"))

shift_id = str(uuid.uuid4())
c.execute("INSERT INTO store_staff_shifts VALUES (?,?,date('now'),?,?,datetime('now'))",
    (shift_id, store_id, json.dumps(["はっしーママ", "タカシ"]), "今日も元気に営業中！"))

conn.commit()
conn.close()

print("✅ データベース作成完了！")
print(f"   店舗ID: {store_id}")
print(f"   はっしーママPIN: 1234 / バーテンダーPIN: 5678")
PYEOF

if [ $? -ne 0 ]; then
    echo "❌ データベースの作成に失敗しました"
    exit 1
fi

# === サーバー起動 ===
cd "$SCRIPT_DIR"
python3 bff/server.py > /tmp/bff.log 2>&1 &
BFF_PID=$!
sleep 2

if ! kill -0 $BFF_PID 2>/dev/null; then
    echo "❌ BFF サーバーの起動に失敗しました"
    echo "   エラーログ:"
    cat /tmp/bff.log
    exit 1
fi
echo "✅ BFF サーバー起動 (port: 3001)"

cd "$SCRIPT_DIR/consumer"
python3 -m http.server 3000 > /tmp/consumer.log 2>&1 &
CONSUMER_PID=$!
echo "✅ 顧客アプリ起動 (port: 3000)"

cd "$SCRIPT_DIR/store"
python3 -m http.server 3002 > /tmp/store.log 2>&1 &
STORE_PID=$!
echo "✅ 店舗アプリ起動 (port: 3002)"

echo ""
echo "========================================="
echo "  🎉 Bottle Amigo MVP 起動完了！"
echo "========================================="
echo ""
echo "  顧客アプリ: http://localhost:3000"
echo "  店舗アプリ: http://localhost:3002"
echo ""
echo "  --- デモアカウント ---"
echo "  顧客: tanaka@example.com / password123"
echo "  店舗: PIN 1234（はっしーママ）/ PIN 5678（バーテンダー）"
echo ""
echo "  停止: Ctrl+C"
echo "========================================="
echo ""

if command -v open &> /dev/null; then
    open "http://localhost:3000"
fi

echo "$BFF_PID $CONSUMER_PID $STORE_PID" > /tmp/bottle_amigo_pids.txt
trap "kill $BFF_PID $CONSUMER_PID $STORE_PID 2>/dev/null; echo ''; echo '🛑 停止しました'; exit 0" INT TERM
wait
