#!/bin/bash
# Bottle Amigo - データベース強制リセット
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$SCRIPT_DIR/bottle_amigo.db"

echo "🔄 データベースをリセットします..."

# サーバーを停止
pkill -f "python3 bff/server.py" 2>/dev/null
pkill -f "python3 -m http.server 300" 2>/dev/null
sleep 1

# DB削除
rm -f "$DB_PATH" "$DB_PATH-journal" "$DB_PATH-wal" "$DB_PATH-shm" 2>/dev/null

# /tmp にも古いのがあれば削除
rm -f /tmp/bottle_amigo.db /tmp/bottle_amigo.db-journal 2>/dev/null

echo "✅ 古いデータベースを削除しました"

# 新規作成＆シードデータ投入
cd "$SCRIPT_DIR"
python3 -c "
import sys, os
sys.path.insert(0, os.getcwd())
from bff.db import init_db, get_connection
init_db()
from bff.seed import seed_data
seed_data()

# 確認
conn = get_connection()
c = conn.cursor()
c.execute('SELECT id FROM stores')
store = c.fetchone()
c.execute('SELECT name, pin FROM staff_accounts')
staff = c.fetchall()
conn.close()
print()
print('=== 確認 ===')
print(f'店舗ID: {store[0]}')
for s in staff:
    print(f'スタッフ: {s[0]} (PIN: {s[1]})')
print()
"

if [ $? -eq 0 ]; then
    echo "✅ データベースのリセット完了！"
    echo ""
    echo "次に ./start.sh で起動してください"
else
    echo "❌ エラーが発生しました"
fi
