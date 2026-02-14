import uuid
import json
import time
from datetime import datetime
from bff.db import get_connection
from bff.middleware.auth import require_user_auth
from bff.services.notification import (
    create_amigo_checkin_notification,
    create_bottle_share_notification
)

@require_user_auth
def get_bottles(self):
    """GET /consumer/bottles - List user's bottles + shared bottles."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get user's own bottles (with store name)
    cursor.execute("""
        SELECT b.id, b.store_id, b.owner_user_id, b.type, b.remaining_pct, b.capacity_ml, b.remaining_ml, b.created_at, b.updated_at,
               s.name as store_name
        FROM bottles b
        LEFT JOIN stores s ON s.id = b.store_id
        WHERE b.owner_user_id = ?
        ORDER BY b.created_at DESC
    """, (self.user_id,))
    own_bottles = []
    for row in cursor.fetchall():
        b = dict(row)
        b['storeId'] = b.pop('store_id')
        b['storeName'] = b.pop('store_name', '')
        b['ownerUserId'] = b.pop('owner_user_id')
        b['remainingPercentage'] = b.pop('remaining_pct')
        b['capacityMl'] = b.pop('capacity_ml', 750)
        b['remainingMl'] = b.pop('remaining_ml', 750)
        b['bottleType'] = b.pop('type')
        own_bottles.append(b)

    # Get bottles shared with user
    cursor.execute("""
        SELECT b.id, b.store_id, b.owner_user_id, b.type, b.remaining_pct, b.capacity_ml, b.remaining_ml, b.created_at, b.updated_at,
               bs.id as share_id, s.name as store_name,
               u.name as owner_name
        FROM bottle_shares bs
        JOIN bottles b ON bs.bottle_id = b.id
        LEFT JOIN stores s ON s.id = b.store_id
        LEFT JOIN users u ON u.id = b.owner_user_id
        WHERE bs.shared_to_user_id = ? AND bs.active = 1
        ORDER BY bs.created_at DESC
    """, (self.user_id,))
    shared_bottles = []
    for row in cursor.fetchall():
        b = dict(row)
        b['storeId'] = b.pop('store_id')
        b['storeName'] = b.pop('store_name', '')
        b['ownerUserId'] = b.pop('owner_user_id')
        b['remainingPercentage'] = b.pop('remaining_pct')
        b['capacityMl'] = b.pop('capacity_ml', 750)
        b['remainingMl'] = b.pop('remaining_ml', 750)
        b['bottleType'] = b.pop('type')
        b['sharedByUserName'] = b.pop('owner_name', '')
        shared_bottles.append(b)

    all_bottles = own_bottles + shared_bottles

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(all_bottles).encode())

@require_user_auth
def get_bottle_detail(self, bottle_id):
    """GET /consumer/bottles/:id - Bottle detail."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT b.id, b.store_id, b.owner_user_id, b.type, b.remaining_pct, b.capacity_ml, b.remaining_ml, b.created_at, b.updated_at,
               s.name as store_name
        FROM bottles b
        LEFT JOIN stores s ON s.id = b.store_id
        WHERE b.id = ?
    """, (bottle_id,))
    bottle_row = cursor.fetchone()

    if not bottle_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Bottle not found'}).encode())
        return

    bottle = dict(bottle_row)
    # Convert to camelCase for frontend
    bottle['storeId'] = bottle.pop('store_id')
    bottle['storeName'] = bottle.pop('store_name', '')
    bottle['ownerUserId'] = bottle.pop('owner_user_id')
    bottle['remainingPercentage'] = bottle.pop('remaining_pct')
    bottle['capacityMl'] = bottle.pop('capacity_ml', 750)
    bottle['remainingMl'] = bottle.pop('remaining_ml', 750)
    bottle['bottleType'] = bottle.pop('type')

    # Get bottle owner info
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (bottle['ownerUserId'],))
    owner = dict(cursor.fetchone())
    bottle['owner'] = owner

    # Get store info
    cursor.execute("SELECT id, name, address FROM stores WHERE id = ?", (bottle['storeId'],))
    store = dict(cursor.fetchone())
    bottle['store'] = store

    # Get bottle shares
    cursor.execute("""
        SELECT id, shared_to_user_id
        FROM bottle_shares
        WHERE bottle_id = ? AND active = 1
    """, (bottle_id,))
    shares = []
    for share_row in cursor.fetchall():
        share_dict = dict(share_row)
        cursor.execute("SELECT id, name FROM users WHERE id = ?", (share_dict['shared_to_user_id'],))
        user = dict(cursor.fetchone())
        share_dict['user'] = user
        shares.append(share_dict)

    bottle['shares'] = shares
    bottle['isSharedToOthers'] = len(shares) > 0

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(bottle).encode())

@require_user_auth
def get_store_detail(self, store_id):
    """GET /consumer/stores/:id - Store detail with today's shift + recent posts."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get store
    cursor.execute("""
        SELECT id, name, address, lat, lng, logo_base64
        FROM stores
        WHERE id = ?
    """, (store_id,))
    store_row = cursor.fetchone()

    if not store_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    store = dict(store_row)
    store['logoBase64'] = store.pop('logo_base64', None)

    # Get today's shift
    cursor.execute("""
        SELECT id, date, staff_names, message_of_the_day
        FROM store_staff_shifts
        WHERE store_id = ? AND date = date('now')
        LIMIT 1
    """, (store_id,))
    shift_row = cursor.fetchone()
    if shift_row:
        shift = dict(shift_row)
        staff_names_raw = json.loads(shift.get('staff_names', '[]'))
        store['todayShift'] = [{'name': n} for n in staff_names_raw]
        store['messageOfTheDay'] = shift.get('message_of_the_day', '')
    else:
        store['todayShift'] = []
        store['messageOfTheDay'] = ''

    # Get recent posts (convert to camelCase for frontend)
    cursor.execute("""
        SELECT id, type, title, body, created_at
        FROM store_posts
        WHERE store_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    """, (store_id,))
    posts = []
    for row in cursor.fetchall():
        p = dict(row)
        posts.append({
            'id': p['id'],
            'type': p['type'],
            'title': p.get('title') or '',
            'content': p['body'],
            'createdAt': p['created_at'],
        })
    store['recentPosts'] = posts

    # Get amigos at this store (only users with active amigo relationship at this store)
    cursor.execute("""
        SELECT DISTINCT u.id, u.name, u.nickname, u.avatar_base64
        FROM users u
        WHERE u.id != ? AND u.id IN (
            SELECT a.target_user_id FROM amigos a
            WHERE a.store_id = ? AND a.status = 'active' AND a.requester_user_id = ?
            UNION
            SELECT a.requester_user_id FROM amigos a
            WHERE a.store_id = ? AND a.status = 'active' AND a.target_user_id = ?
        )
        ORDER BY u.name
    """, (self.user_id, store_id, self.user_id, store_id, self.user_id))
    amigos = []
    for row in cursor.fetchall():
        a = dict(row)

        # Check if this amigo has an active checkin
        cursor.execute("""
            SELECT COUNT(*) as count FROM check_ins
            WHERE store_id = ? AND user_id = ? AND status = 'active'
        """, (store_id, a['id']))
        is_checked_in = cursor.fetchone()['count'] > 0

        amigos.append({
            'id': a['id'],
            'name': a.get('nickname') or a['name'],
            'avatarBase64': a.get('avatar_base64'),
            'isCheckedIn': is_checked_in,
        })
    store['amigos'] = amigos

    # Get current user's bottles at this store
    cursor.execute("""
        SELECT id, type, remaining_pct, capacity_ml, remaining_ml
        FROM bottles
        WHERE store_id = ? AND owner_user_id = ?
        ORDER BY created_at DESC
    """, (store_id, self.user_id))
    my_bottles = []
    for row in cursor.fetchall():
        b = dict(row)
        my_bottles.append({
            'id': b['id'],
            'bottleType': b['type'],
            'remainingPercentage': b['remaining_pct'],
            'capacityMl': b.get('capacity_ml', 750),
            'remainingMl': b.get('remaining_ml', 750),
        })
    store['myBottles'] = my_bottles

    # Get last checkin date for current user at this store
    cursor.execute("""
        SELECT created_at FROM check_ins
        WHERE store_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (store_id, self.user_id))
    last_checkin_row = cursor.fetchone()
    store['lastCheckinDate'] = last_checkin_row['created_at'] if last_checkin_row else None

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(store).encode())

@require_user_auth
def create_checkin(self, body):
    """POST /consumer/checkins - Create checkin + generate notifications."""
    required = ['storeId', 'notifyToUserIds']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    notify_to_user_ids = body['notifyToUserIds']

    conn = get_connection()
    cursor = conn.cursor()

    # Verify store exists
    cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    # Close any existing active checkins for this user at ALL stores
    # (user can only be checked in at one store at a time)
    cursor.execute("""
        UPDATE check_ins SET status = 'completed'
        WHERE user_id = ? AND status = 'active'
    """, (self.user_id,))

    # Create checkin
    checkin_id = str(uuid.uuid4())
    notify_json = json.dumps(notify_to_user_ids)

    cursor.execute("""
        INSERT INTO check_ins (id, store_id, user_id, notify_to_user_ids)
        VALUES (?, ?, ?, ?)
    """, (checkin_id, store_id, self.user_id, notify_json))

    conn.commit()

    # Get checkin user info
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (self.user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        self.send_response(401)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'ユーザーが見つかりません。ログインし直してください。'}).encode())
        return
    user = dict(user_row)

    checkin_row = cursor.execute("""
        SELECT id, store_id, user_id, notify_to_user_ids, status, created_at
        FROM check_ins
        WHERE id = ?
    """, (checkin_id,)).fetchone()
    checkin = dict(checkin_row)
    checkin['notify_to_user_ids'] = json.loads(checkin['notify_to_user_ids'])
    checkin['user'] = user

    conn.close()

    # Create notifications
    create_amigo_checkin_notification(self.user_id, store_id, checkin_id)

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(checkin).encode())

@require_user_auth
def get_amigos(self, params):
    """GET /consumer/amigos?storeId= - List amigos (optionally filtered by store)."""
    store_id = params.get('storeId', '')

    conn = get_connection()
    cursor = conn.cursor()

    # Get amigos (bidirectional) - with or without store filter
    if store_id:
        cursor.execute("""
            SELECT a.id, a.store_id, a.requester_user_id, a.target_user_id, a.status, a.created_at, a.accepted_at,
                   s.name as store_name
            FROM amigos a
            LEFT JOIN stores s ON s.id = a.store_id
            WHERE a.store_id = ?
            AND (a.requester_user_id = ? OR a.target_user_id = ?)
        """, (store_id, self.user_id, self.user_id))
    else:
        cursor.execute("""
            SELECT a.id, a.store_id, a.requester_user_id, a.target_user_id, a.status, a.created_at, a.accepted_at,
                   s.name as store_name
            FROM amigos a
            LEFT JOIN stores s ON s.id = a.store_id
            WHERE (a.requester_user_id = ? OR a.target_user_id = ?)
        """, (self.user_id, self.user_id))

    amigos = []
    for amigo_row in cursor.fetchall():
        amigo = dict(amigo_row)
        # Get the other user
        other_user_id = amigo['target_user_id'] if amigo['requester_user_id'] == self.user_id else amigo['requester_user_id']
        cursor.execute("SELECT id, name, nickname, avatar_base64 FROM users WHERE id = ?", (other_user_id,))
        user_row = cursor.fetchone()
        if user_row:
            u = dict(user_row)
            amigo['name'] = u.get('nickname') or u['name']
            amigo['avatarBase64'] = u.get('avatar_base64')
        else:
            amigo['name'] = '不明'
            amigo['avatarBase64'] = None
        amigo['userId'] = other_user_id
        amigo['storeName'] = amigo.pop('store_name', '')
        # Whether this user is the one who needs to accept
        amigo['canAccept'] = (amigo['target_user_id'] == self.user_id and amigo['status'] == 'pending')
        amigos.append(amigo)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(amigos).encode())

@require_user_auth
def request_amigo(self, body):
    """POST /consumer/amigos/request - Create pending amigo (requires active checkin)."""
    target_user_id = body.get('targetUserId')
    if not target_user_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'targetUserId is required'}).encode())
        return

    if target_user_id == self.user_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Cannot amigo yourself'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Must be checked in — get store from active checkin
    store_id = body.get('storeId', '')
    if not store_id:
        cursor.execute("""
            SELECT store_id FROM check_ins
            WHERE user_id = ? AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        """, (self.user_id,))
        checkin_row = cursor.fetchone()
        if not checkin_row:
            conn.close()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '店舗にチェックインしてください'}).encode())
            return
        store_id = checkin_row['store_id']

    # Verify target user exists
    cursor.execute("SELECT id FROM users WHERE id = ?", (target_user_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Target user not found'}).encode())
        return

    # Verify store exists
    cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    # Check if relationship already exists at this store
    cursor.execute("""
        SELECT id FROM amigos
        WHERE store_id = ? AND (
            (requester_user_id = ? AND target_user_id = ?) OR
            (requester_user_id = ? AND target_user_id = ?)
        )
    """, (store_id, self.user_id, target_user_id, target_user_id, self.user_id))

    if cursor.fetchone():
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'この店舗ではすでにAmigo申請済みです'}).encode())
        return

    # Create amigo request
    amigo_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO amigos (id, store_id, requester_user_id, target_user_id, status)
        VALUES (?, ?, ?, ?, 'pending')
    """, (amigo_id, store_id, self.user_id, target_user_id))

    conn.commit()

    amigo_row = cursor.execute("""
        SELECT id, requester_user_id, target_user_id, status, created_at
        FROM amigos
        WHERE id = ?
    """, (amigo_id,)).fetchone()
    amigo = dict(amigo_row)

    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(amigo).encode())

@require_user_auth
def accept_amigo(self, amigo_id):
    """POST /consumer/amigos/:id/accept - Accept amigo request."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, requester_user_id, target_user_id, status
        FROM amigos
        WHERE id = ?
    """, (amigo_id,))
    amigo_row = cursor.fetchone()

    if not amigo_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Amigo not found'}).encode())
        return

    amigo = dict(amigo_row)

    # Verify user is the target
    if amigo['target_user_id'] != self.user_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Cannot accept this amigo request'}).encode())
        return

    # Update to active
    cursor.execute("""
        UPDATE amigos
        SET status = 'active', accepted_at = datetime('now')
        WHERE id = ?
    """, (amigo_id,))

    conn.commit()

    amigo_row = cursor.execute("""
        SELECT id, requester_user_id, target_user_id, status, accepted_at
        FROM amigos
        WHERE id = ?
    """, (amigo_id,)).fetchone()
    amigo = dict(amigo_row)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(amigo).encode())

@require_user_auth
def get_active_checkin(self):
    """GET /consumer/checkins/active - Get current active checkin."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ci.id, ci.store_id, ci.created_at, s.name as store_name
        FROM check_ins ci
        JOIN stores s ON s.id = ci.store_id
        WHERE ci.user_id = ? AND ci.status = 'active'
        ORDER BY ci.created_at DESC
        LIMIT 1
    """, (self.user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(None).encode())
        return

    checkin = dict(row)
    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'id': checkin['id'],
        'storeId': checkin['store_id'],
        'storeName': checkin['store_name'],
        'createdAt': checkin['created_at'],
    }).encode())

@require_user_auth
def get_amigo_qr_token(self):
    """GET /consumer/amigos/myqr - Generate a QR token for Amigo add (requires active checkin)."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check active checkin
    cursor.execute("""
        SELECT ci.store_id, s.name as store_name
        FROM check_ins ci
        JOIN stores s ON s.id = ci.store_id
        WHERE ci.user_id = ? AND ci.status = 'active'
        ORDER BY ci.created_at DESC LIMIT 1
    """, (self.user_id,))
    checkin_row = cursor.fetchone()
    if not checkin_row:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '店舗にチェックインしてください'}).encode())
        return

    store_id = checkin_row['store_id']
    store_name = checkin_row['store_name']

    # Create amigo_qr_tokens table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS amigo_qr_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            store_id TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            used INTEGER DEFAULT 0
        )
    """)

    # Add store_id column if missing (migration)
    try:
        cursor.execute("ALTER TABLE amigo_qr_tokens ADD COLUMN store_id TEXT NOT NULL DEFAULT ''")
    except:
        pass

    # Clean old tokens (older than 10 minutes)
    cursor.execute("DELETE FROM amigo_qr_tokens WHERE created_at < ?", (int(time.time()) - 600,))

    # Generate new token
    token = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO amigo_qr_tokens (token, user_id, store_id, created_at) VALUES (?, ?, ?, ?)
    """, (token, self.user_id, store_id, int(time.time())))
    conn.commit()

    # Get user info for display
    cursor.execute("SELECT name, nickname, avatar_base64 FROM users WHERE id = ?", (self.user_id,))
    user = dict(cursor.fetchone())
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'token': token,
        'name': user.get('nickname') or user['name'],
        'avatarBase64': user.get('avatar_base64'),
        'storeName': store_name,
    }).encode())

@require_user_auth
def amigo_scan_qr(self, body):
    """POST /consumer/amigos/scan - Scan QR token to create amigo relationship."""
    token = body.get('token', '')
    if not token:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'token is required'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Scanner must be checked in
    cursor.execute("""
        SELECT store_id FROM check_ins
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC LIMIT 1
    """, (self.user_id,))
    scanner_checkin = cursor.fetchone()
    if not scanner_checkin:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '店舗にチェックインしてください'}).encode())
        return

    scanner_store_id = scanner_checkin['store_id']

    # Ensure table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS amigo_qr_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            store_id TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            used INTEGER DEFAULT 0
        )
    """)

    # Find the token
    cursor.execute("SELECT * FROM amigo_qr_tokens WHERE token = ?", (token,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'QRコードが無効です'}).encode())
        return

    qr = dict(row)

    # Check expiry (10 minutes)
    if int(time.time()) - qr['created_at'] > 600:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'QRコードの有効期限が切れています'}).encode())
        return

    if qr['used']:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'このQRコードは使用済みです'}).encode())
        return

    target_user_id = qr['user_id']
    qr_store_id = qr.get('store_id', '')

    if target_user_id == self.user_id:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '自分のQRコードは読み取れません'}).encode())
        return

    # Both must be at the same store
    if qr_store_id and qr_store_id != scanner_store_id:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '同じ店舗にチェックインしている必要があります'}).encode())
        return

    # Use the store from QR token (or scanner's store as fallback)
    store_id = qr_store_id or scanner_store_id

    # Check if amigo relationship already exists at this store
    cursor.execute("""
        SELECT id, status FROM amigos
        WHERE store_id = ? AND (
            (requester_user_id = ? AND target_user_id = ?)
            OR (requester_user_id = ? AND target_user_id = ?)
        )
    """, (store_id, self.user_id, target_user_id, target_user_id, self.user_id))
    existing = cursor.fetchone()

    if existing:
        ex = dict(existing)
        conn.close()
        status_msg = 'この店舗ではすでにAmigoです' if ex['status'] == 'active' else 'すでにAmigo申請中です'
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': status_msg}).encode())
        return

    # Mark token as used
    cursor.execute("UPDATE amigo_qr_tokens SET used = 1 WHERE token = ?", (token,))

    # Create amigo — auto-accept (both people are present, so no need for pending)
    amigo_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO amigos (id, store_id, requester_user_id, target_user_id, status, accepted_at)
        VALUES (?, ?, ?, ?, 'active', datetime('now'))
    """, (amigo_id, store_id, self.user_id, target_user_id))
    conn.commit()

    # Get target user info and store name
    cursor.execute("SELECT name, nickname, avatar_base64 FROM users WHERE id = ?", (target_user_id,))
    target = dict(cursor.fetchone())
    cursor.execute("SELECT name FROM stores WHERE id = ?", (store_id,))
    store_row = cursor.fetchone()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'success': True,
        'amigoId': amigo_id,
        'name': target.get('nickname') or target['name'],
        'avatarBase64': target.get('avatar_base64'),
        'storeName': store_row['name'] if store_row else '',
    }).encode())

@require_user_auth
def create_bottle_share(self, body):
    """POST /consumer/shares - Create bottle share + notify."""
    required = ['bottleId', 'sharedToUserId']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    bottle_id = body['bottleId']
    shared_to_user_id = body['sharedToUserId']

    if shared_to_user_id == self.user_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Cannot share with yourself'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get bottle
    cursor.execute("""
        SELECT id, store_id, owner_user_id
        FROM bottles
        WHERE id = ?
    """, (bottle_id,))
    bottle_row = cursor.fetchone()

    if not bottle_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Bottle not found'}).encode())
        return

    bottle = dict(bottle_row)

    # Verify user is bottle owner
    if bottle['owner_user_id'] != self.user_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Can only share your own bottles'}).encode())
        return

    # Verify target user exists
    cursor.execute("SELECT id FROM users WHERE id = ?", (shared_to_user_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Target user not found'}).encode())
        return

    # Check if share already exists
    cursor.execute("""
        SELECT id FROM bottle_shares
        WHERE bottle_id = ? AND shared_to_user_id = ? AND active = 1
    """, (bottle_id, shared_to_user_id))

    if cursor.fetchone():
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Already shared with this user'}).encode())
        return

    # Create share
    share_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO bottle_shares (id, bottle_id, store_id, owner_user_id, shared_to_user_id)
        VALUES (?, ?, ?, ?, ?)
    """, (share_id, bottle_id, bottle['store_id'], self.user_id, shared_to_user_id))

    conn.commit()

    share_row = cursor.execute("""
        SELECT id, bottle_id, shared_to_user_id, active, created_at
        FROM bottle_shares
        WHERE id = ?
    """, (share_id,)).fetchone()
    share = dict(share_row)

    conn.close()

    # Create notification
    create_bottle_share_notification(shared_to_user_id, bottle_id, share_id)

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(share).encode())

@require_user_auth
def end_bottle_share(self, share_id):
    """POST /consumer/shares/:id/end - End bottle share."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, bottle_id, owner_user_id, shared_to_user_id
        FROM bottle_shares
        WHERE id = ?
    """, (share_id,))
    share_row = cursor.fetchone()

    if not share_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Share not found'}).encode())
        return

    share = dict(share_row)

    # Verify user is share owner
    if share['owner_user_id'] != self.user_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Can only end your own shares'}).encode())
        return

    # Update share
    cursor.execute("""
        UPDATE bottle_shares
        SET active = 0, ended_at = datetime('now')
        WHERE id = ?
    """, (share_id,))

    conn.commit()

    share_row = cursor.execute("""
        SELECT id, active, ended_at
        FROM bottle_shares
        WHERE id = ?
    """, (share_id,)).fetchone()
    share = dict(share_row)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(share).encode())

@require_user_auth
def get_notifications(self):
    """GET /consumer/notifications - List notifications (newest first)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, type, payload_json, created_at, read_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
    """, (self.user_id,))

    notifications = []
    for row in cursor.fetchall():
        notification = dict(row)
        notification['data'] = json.loads(notification['payload_json'])
        del notification['payload_json']
        notification['createdAt'] = notification.pop('created_at', '')
        notification['readAt'] = notification.pop('read_at', None)

        # Ensure store_id is present in data for navigation
        data = notification['data']
        if 'store_id' not in data and 'bottle_id' in data:
            bottle_row = cursor.execute(
                "SELECT store_id FROM bottles WHERE id = ?",
                (data['bottle_id'],)
            ).fetchone()
            if bottle_row:
                data['store_id'] = bottle_row['store_id']

        # Ensure storeName is present for display
        if 'storeName' not in data and 'store_id' in data:
            store_row = cursor.execute(
                "SELECT name FROM stores WHERE id = ?",
                (data['store_id'],)
            ).fetchone()
            if store_row:
                data['storeName'] = store_row['name']

        # Ensure userName is present for checkin/share notifications
        if 'userName' not in data and 'user_id' in data:
            user_row = cursor.execute(
                "SELECT name, nickname FROM users WHERE id = ?",
                (data['user_id'],)
            ).fetchone()
            if user_row:
                data['userName'] = user_row['nickname'] or user_row['name']

        notifications.append(notification)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(notifications).encode())

@require_user_auth
def search_users(self, params):
    """GET /consumer/users/search?q= - Search users."""
    query = params.get('q', '')

    if not query:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'q is required'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Search users by name, nickname, or email, excluding self
    search_term = f"%{query}%"
    cursor.execute("""
        SELECT DISTINCT u.id, u.name, u.nickname, u.avatar_base64
        FROM users u
        WHERE u.id != ? AND (u.name LIKE ? OR u.nickname LIKE ? OR u.email LIKE ?)
        LIMIT 20
    """, (self.user_id, search_term, search_term, search_term))

    users = []
    for row in cursor.fetchall():
        u = dict(row)
        users.append({
            'id': u['id'],
            'name': u.get('nickname') or u['name'],
            'avatarBase64': u.get('avatar_base64'),
        })

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(users).encode())

@require_user_auth
def get_user_profile(self, user_id):
    """GET /consumer/users/<id> - Get another user's public profile."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, nickname, avatar_base64, birthday_month, birthday_day, birthday_public, bio
        FROM users WHERE id = ?
    """, (user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    user = dict(user_row)

    # Get shared stores (stores where both users have amigo relationship)
    cursor.execute("""
        SELECT DISTINCT s.id, s.name, s.logo_base64
        FROM amigos a
        JOIN stores s ON s.id = a.store_id
        WHERE a.status = 'active' AND (
            (a.requester_user_id = ? AND a.target_user_id = ?)
            OR (a.requester_user_id = ? AND a.target_user_id = ?)
        )
    """, (self.user_id, user_id, user_id, self.user_id))
    shared_stores = []
    for row in cursor.fetchall():
        store = dict(row)
        shared_stores.append({
            'id': store['id'],
            'name': store['name'],
            'logoBase64': store.get('logo_base64')
        })

    conn.close()

    # Build public profile (hide birthday if not public)
    profile = {
        'id': user['id'],
        'name': user.get('nickname') or user['name'],
        'avatarBase64': user.get('avatar_base64'),
        'bio': user.get('bio') or '',
        'sharedStores': shared_stores
    }
    if user.get('birthday_public'):
        profile['birthdayMonth'] = user.get('birthday_month')
        profile['birthdayDay'] = user.get('birthday_day')

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(profile).encode())

@require_user_auth
def get_profile(self):
    """GET /consumer/profile - Get user profile with notification settings."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, email, nickname, avatar_base64, birthday_month, birthday_day, birthday_public, bio
        FROM users
        WHERE id = ?
    """, (self.user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    user = dict(user_row)

    # Get notification settings
    cursor.execute("""
        SELECT amigo_checkin_notify, store_post_notify
        FROM user_notification_settings
        WHERE user_id = ?
    """, (self.user_id,))
    settings_row = cursor.fetchone()
    if settings_row:
        user['notificationSettings'] = {
            'amigoCheckinNotify': settings_row['amigo_checkin_notify'],
            'storePostNotify': settings_row['store_post_notify']
        }
    else:
        user['notificationSettings'] = {
            'amigoCheckinNotify': 1,
            'storePostNotify': 1
        }

    # Convert to camelCase
    user['avatarBase64'] = user.pop('avatar_base64', None)
    user['birthdayMonth'] = user.pop('birthday_month', None)
    user['birthdayDay'] = user.pop('birthday_day', None)
    user['birthdayPublic'] = user.pop('birthday_public', 0)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(user).encode())

@require_user_auth
def update_profile(self, body):
    """POST /consumer/profile - Update user profile."""
    conn = get_connection()
    cursor = conn.cursor()

    # Extract fields
    nickname = body.get('nickname')
    avatar_base64 = body.get('avatarBase64')
    birthday_month = body.get('birthdayMonth')
    birthday_day = body.get('birthdayDay')
    birthday_public = body.get('birthdayPublic', 0)
    bio = body.get('bio')

    # Build update query
    updates = []
    params = []

    if nickname is not None:
        updates.append('nickname = ?')
        params.append(nickname)
    if avatar_base64 is not None:
        updates.append('avatar_base64 = ?')
        params.append(avatar_base64)
    if birthday_month is not None:
        updates.append('birthday_month = ?')
        params.append(birthday_month)
    if birthday_day is not None:
        updates.append('birthday_day = ?')
        params.append(birthday_day)
    if birthday_public is not None:
        updates.append('birthday_public = ?')
        params.append(birthday_public)
    if bio is not None:
        updates.append('bio = ?')
        params.append(bio)

    # Update user
    if updates:
        params.append(self.user_id)
        update_sql = "UPDATE users SET " + ", ".join(updates) + " WHERE id = ?"
        cursor.execute(update_sql, params)
        conn.commit()

    # Handle notification settings
    if 'notificationSettings' in body:
        settings = body['notificationSettings']
        amigo_notify = settings.get('amigoCheckinNotify', 1)
        post_notify = settings.get('storePostNotify', 1)

        # Try to insert, or update if exists
        cursor.execute("""
            INSERT OR REPLACE INTO user_notification_settings
            (user_id, amigo_checkin_notify, store_post_notify)
            VALUES (?, ?, ?)
        """, (self.user_id, amigo_notify, post_notify))
        conn.commit()

    # Fetch updated profile
    cursor.execute("""
        SELECT id, name, email, nickname, avatar_base64, birthday_month, birthday_day, birthday_public, bio
        FROM users
        WHERE id = ?
    """, (self.user_id,))
    user_row = cursor.fetchone()
    user = dict(user_row)

    # Get notification settings
    cursor.execute("""
        SELECT amigo_checkin_notify, store_post_notify
        FROM user_notification_settings
        WHERE user_id = ?
    """, (self.user_id,))
    settings_row = cursor.fetchone()
    if settings_row:
        user['notificationSettings'] = {
            'amigoCheckinNotify': settings_row['amigo_checkin_notify'],
            'storePostNotify': settings_row['store_post_notify']
        }
    else:
        user['notificationSettings'] = {
            'amigoCheckinNotify': 1,
            'storePostNotify': 1
        }

    # Convert to camelCase
    user['avatarBase64'] = user.pop('avatar_base64', None)
    user['birthdayMonth'] = user.pop('birthday_month', None)
    user['birthdayDay'] = user.pop('birthday_day', None)
    user['birthdayPublic'] = user.pop('birthday_public', 0)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(user).encode())

@require_user_auth
def get_home(self):
    """GET /consumer/home - Get home feed with all stores."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get all stores (not just ones where user has bottles)
    cursor.execute("""
        SELECT s.id, s.name, s.logo_base64
        FROM stores s
        ORDER BY s.name
    """)

    stores = []
    for store_row in cursor.fetchall():
        store = dict(store_row)

        # Count bottles at this store for this user
        cursor.execute("""
            SELECT COUNT(*) as count FROM bottles
            WHERE store_id = ? AND owner_user_id = ?
        """, (store['id'], self.user_id))
        bottle_count = cursor.fetchone()['count']

        # Get active checkins — only show users who are amigos at THIS store
        # (i.e. have an active amigo relationship at this store)
        cursor.execute("""
            SELECT DISTINCT u.id, u.name, u.nickname, u.avatar_base64
            FROM check_ins ci
            JOIN users u ON u.id = ci.user_id
            WHERE ci.store_id = ? AND ci.status = 'active'
              AND u.id IN (
                SELECT a.requester_user_id FROM amigos a
                WHERE a.store_id = ? AND a.status = 'active'
                  AND a.target_user_id = ?
                UNION
                SELECT a.target_user_id FROM amigos a
                WHERE a.store_id = ? AND a.status = 'active'
                  AND a.requester_user_id = ?
              )
        """, (store['id'], store['id'], self.user_id,
              store['id'], self.user_id))
        active_amigos = []
        for row in cursor.fetchall():
            amigo = dict(row)
            active_amigos.append({
                'name': amigo.get('nickname') or amigo['name'],
                'avatarBase64': amigo.get('avatar_base64')
            })

        # Check if current user has active checkin at this store
        cursor.execute("""
            SELECT COUNT(*) as count FROM check_ins
            WHERE store_id = ? AND user_id = ? AND status = 'active'
        """, (store['id'], self.user_id))
        user_checked_in = cursor.fetchone()['count'] > 0

        # Get last checkin date for this user at this store
        cursor.execute("""
            SELECT created_at FROM check_ins
            WHERE store_id = ? AND user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (store['id'], self.user_id))
        last_checkin_row = cursor.fetchone()
        last_checkin_date = last_checkin_row['created_at'] if last_checkin_row else None

        store['bottleCount'] = bottle_count
        store['activeAmigos'] = active_amigos
        store['userCheckedIn'] = user_checked_in
        store['lastCheckinDate'] = last_checkin_date
        store['logoBase64'] = store.pop('logo_base64', None)

        stores.append(store)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(stores).encode())
