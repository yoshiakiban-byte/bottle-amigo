import uuid
import json
from datetime import datetime
from bff.db import get_connection
from bff.middleware.auth import require_staff_auth, require_mama_only
from bff.services.notification import (
    create_store_post_notification,
    create_bottle_gift_notification
)

@require_staff_auth
def get_active_checkins(self, params):
    """GET /store/checkins/active?storeId= - Active checkins with user info + bottle info."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, notify_to_user_ids, status, created_at
        FROM check_ins
        WHERE store_id = ? AND status = 'active'
        ORDER BY created_at DESC
    """, (store_id,))

    checkins = []
    for checkin_row in cursor.fetchall():
        row = dict(checkin_row)

        # Get user info with avatar
        cursor.execute("SELECT id, name, nickname, avatar_base64 FROM users WHERE id = ?", (row['user_id'],))
        user_row = cursor.fetchone()
        user = dict(user_row) if user_row else {'id': row['user_id'], 'name': '不明'}
        if 'avatar_base64' in user:
            user['avatarBase64'] = user.pop('avatar_base64', None)

        # Get previous checkin date (the one before current active)
        cursor.execute("""
            SELECT created_at FROM check_ins
            WHERE store_id = ? AND user_id = ? AND id != ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (store_id, row['user_id'], row['id']))
        prev_row = cursor.fetchone()
        prev_checkin_date = prev_row['created_at'] if prev_row else None

        # Get user's bottles at this store
        cursor.execute("""
            SELECT id, type, remaining_pct, capacity_ml, remaining_ml
            FROM bottles
            WHERE store_id = ? AND owner_user_id = ?
        """, (store_id, row['user_id']))
        bottles = [dict(r) for r in cursor.fetchall()]
        for b in bottles:
            b['remainingPct'] = b.pop('remaining_pct', 0)
            b['capacityMl'] = b.pop('capacity_ml', 750)
            b['remainingMl'] = b.pop('remaining_ml', 750)

        # Build camelCase checkin object for frontend
        checkin = {
            'id': row['id'],
            'userId': row['user_id'],
            'userName': user.get('nickname') or user['name'],
            'userAvatar': user.get('avatarBase64'),
            'checkinTime': row['created_at'],
            'previousCheckinDate': prev_checkin_date,
            'status': row['status'],
            'bottles': bottles,
            'user': user,
        }
        checkins.append(checkin)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'checkins': checkins}).encode())

@require_staff_auth
def get_customer_summary(self, user_id, params):
    """GET /store/customers/:userId/summary?storeId= - Customer summary."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get user
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    summary = {'user': dict(user_row)}

    # Get user's bottles at this store
    cursor.execute("""
        SELECT id, type, remaining_pct, capacity_ml, remaining_ml, created_at
        FROM bottles
        WHERE store_id = ? AND owner_user_id = ?
    """, (store_id, user_id))
    bottles = []
    for row in cursor.fetchall():
        b = dict(row)
        b['capacityMl'] = b.pop('capacity_ml', 750)
        b['remainingMl'] = b.pop('remaining_ml', 750)
        bottles.append(b)
    summary['bottles'] = bottles

    # Get active bottle shares
    cursor.execute("""
        SELECT bs.id, b.type, u.name as shared_to_name
        FROM bottle_shares bs
        JOIN bottles b ON bs.bottle_id = b.id
        JOIN users u ON bs.shared_to_user_id = u.id
        WHERE bs.store_id = ? AND bs.owner_user_id = ? AND bs.active = 1
    """, (store_id, user_id))
    shares = [dict(row) for row in cursor.fetchall()]
    summary['activeShares'] = shares

    # Get recent memos
    cursor.execute("""
        SELECT id, body, author_staff_id, created_at
        FROM customer_memos
        WHERE store_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    """, (store_id, user_id))
    memos = [dict(row) for row in cursor.fetchall()]
    summary['recentMemos'] = memos

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(summary).encode())

@require_staff_auth
def update_bottle_remaining_pct(self, bottle_id, body):
    """POST /store/bottles/:id/updateRemainingPct - Update remaining ml (also accepts pct for backward compat)."""
    # Accept either remainingMl or remainingPct
    remaining_ml = body.get('remainingMl')
    remaining_pct = body.get('remainingPct')

    if remaining_ml is None and remaining_pct is None:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'remainingMl or remainingPct required'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get bottle
    cursor.execute("""
        SELECT id, store_id, remaining_pct, capacity_ml, remaining_ml FROM bottles WHERE id = ?
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

    # Verify staff works at this store
    if bottle['store_id'] != self.store_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    previous_pct = bottle['remaining_pct']
    previous_ml = bottle['remaining_ml'] or 0
    capacity_ml = bottle['capacity_ml'] or 750

    # Calculate new values
    if remaining_ml is not None:
        new_ml = max(0, min(capacity_ml, int(remaining_ml)))
        new_pct = int(round(new_ml / capacity_ml * 100)) if capacity_ml > 0 else 0
    else:
        new_pct = max(0, min(100, int(remaining_pct)))
        new_ml = int(round(new_pct / 100.0 * capacity_ml))

    # Update bottle
    cursor.execute("""
        UPDATE bottles
        SET remaining_pct = ?, remaining_ml = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (new_pct, new_ml, bottle_id))

    # Log bottle history
    history_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO bottle_history (id, bottle_id, store_id, staff_id, previous_pct, new_pct, previous_ml, new_ml, change_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'update')
    """, (history_id, bottle_id, bottle['store_id'], self.staff_id, previous_pct, new_pct, previous_ml, new_ml))

    conn.commit()

    bottle_row = cursor.execute("""
        SELECT id, remaining_pct, capacity_ml, remaining_ml, updated_at FROM bottles WHERE id = ?
    """, (bottle_id,)).fetchone()
    result = dict(bottle_row)
    result['capacityMl'] = result.pop('capacity_ml', 750)
    result['remainingMl'] = result.pop('remaining_ml', 0)
    result['remainingPct'] = result.pop('remaining_pct', 0)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(result).encode())

@require_staff_auth
@require_mama_only
def refill_bottle_to_full(self, bottle_id):
    """POST /store/bottles/:id/refillToFull - Set to full capacity (mama only)."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get bottle
    cursor.execute("""
        SELECT id, store_id, remaining_pct, capacity_ml, remaining_ml FROM bottles WHERE id = ?
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

    # Verify staff works at this store
    if bottle['store_id'] != self.store_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    previous_pct = bottle['remaining_pct']
    previous_ml = bottle['remaining_ml'] or 0
    capacity_ml = bottle['capacity_ml'] or 750

    # Update bottle
    cursor.execute("""
        UPDATE bottles
        SET remaining_pct = 100, remaining_ml = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (capacity_ml, bottle_id))

    # Log bottle history
    history_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO bottle_history (id, bottle_id, store_id, staff_id, previous_pct, new_pct, previous_ml, new_ml, change_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'refill')
    """, (history_id, bottle_id, bottle['store_id'], self.staff_id, previous_pct, 100, previous_ml, capacity_ml))

    conn.commit()

    bottle_row = cursor.execute("""
        SELECT id, remaining_pct, capacity_ml, remaining_ml, updated_at FROM bottles WHERE id = ?
    """, (bottle_id,)).fetchone()
    result = dict(bottle_row)
    result['capacityMl'] = result.pop('capacity_ml', 750)
    result['remainingMl'] = result.pop('remaining_ml', 750)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(result).encode())

@require_staff_auth
def add_new_bottle(self, body):
    """POST /store/bottles/addNew - Create new bottle (any staff)."""
    required = ['storeId', 'ownerUserId', 'type']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    owner_user_id = body['ownerUserId']
    bottle_type = body['type']
    capacity_ml = body.get('capacityMl', 750)
    remaining_ml = body.get('remainingMl', None)  # None = new (full), int = existing bottle

    if not isinstance(capacity_ml, int) or capacity_ml <= 0:
        capacity_ml = 750

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Verify store and user exist
    cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    cursor.execute("SELECT id FROM users WHERE id = ?", (owner_user_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    # Create bottle — if remainingMl specified, it's an existing (partially consumed) bottle
    bottle_id = str(uuid.uuid4())
    if remaining_ml is not None:
        remaining_ml = max(0, min(capacity_ml, int(remaining_ml)))
        remaining_pct = int(round(remaining_ml / capacity_ml * 100)) if capacity_ml > 0 else 0
    else:
        remaining_ml = capacity_ml
        remaining_pct = 100

    cursor.execute("""
        INSERT INTO bottles (id, store_id, owner_user_id, type, capacity_ml, remaining_ml, remaining_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (bottle_id, store_id, owner_user_id, bottle_type, capacity_ml, remaining_ml, remaining_pct))

    conn.commit()

    bottle_row = cursor.execute("""
        SELECT id, store_id, owner_user_id, type, remaining_pct, capacity_ml, remaining_ml, created_at
        FROM bottles
        WHERE id = ?
    """, (bottle_id,)).fetchone()
    bottle = dict(bottle_row)
    bottle['capacityMl'] = bottle.pop('capacity_ml', 750)
    bottle['remainingMl'] = bottle.pop('remaining_ml', 750)

    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(bottle).encode())

@require_staff_auth
def create_memo(self, body):
    """POST /store/memos - Create customer memo."""
    required = ['storeId', 'userId', 'body']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    user_id = body['userId']
    memo_body = body['body']

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Verify store and user exist
    cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    # Create memo
    memo_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO customer_memos (id, store_id, user_id, author_staff_id, body)
        VALUES (?, ?, ?, ?, ?)
    """, (memo_id, store_id, user_id, self.staff_id, memo_body))

    conn.commit()

    memo_row = cursor.execute("""
        SELECT id, store_id, user_id, author_staff_id, body, created_at
        FROM customer_memos
        WHERE id = ?
    """, (memo_id,)).fetchone()
    memo = dict(memo_row)

    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(memo).encode())

@require_staff_auth
def create_post(self, body):
    """POST /store/posts - Create post + notify bottle holders."""
    required = ['storeId', 'type', 'body']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    post_type = body['type']
    post_body = body['body']
    title = body.get('title', None)

    if post_type not in ['event', 'memo', 'intro', 'message', 'staff']:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Invalid post type'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

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

    # Create post
    post_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO store_posts (id, store_id, type, title, body)
        VALUES (?, ?, ?, ?, ?)
    """, (post_id, store_id, post_type, title, post_body))

    conn.commit()

    post_row = cursor.execute("""
        SELECT id, store_id, type, title, body, created_at
        FROM store_posts
        WHERE id = ?
    """, (post_id,)).fetchone()
    post = dict(post_row)

    conn.close()

    # Create notifications
    create_store_post_notification(store_id, post_id, post_type)

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(post).encode())

@require_staff_auth
def update_post(self, post_id, body):
    """POST /store/posts/<id>/update - Update a post."""
    conn = get_connection()
    cursor = conn.cursor()

    row = cursor.execute(
        "SELECT id, store_id, type, title, body FROM store_posts WHERE id = ?",
        (post_id,)
    ).fetchone()

    if not row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Post not found'}).encode())
        return

    post = dict(row)
    if post['store_id'] != self.store_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    new_type = body.get('type', post['type'])
    new_title = body.get('title', post['title'])
    new_body = body.get('body', post['body'])

    if not new_body:
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Body is required'}).encode())
        return

    cursor.execute("""
        UPDATE store_posts SET type = ?, title = ?, body = ? WHERE id = ?
    """, (new_type, new_title, new_body, post_id))
    conn.commit()

    updated = dict(cursor.execute(
        "SELECT id, store_id, type, title, body, created_at FROM store_posts WHERE id = ?",
        (post_id,)
    ).fetchone())
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(updated).encode())

@require_staff_auth
def delete_post(self, post_id, body):
    """POST /store/posts/<id>/delete - Delete a post."""
    conn = get_connection()
    cursor = conn.cursor()

    row = cursor.execute(
        "SELECT id, store_id FROM store_posts WHERE id = ?",
        (post_id,)
    ).fetchone()

    if not row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Post not found'}).encode())
        return

    post = dict(row)
    if post['store_id'] != self.store_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    cursor.execute("DELETE FROM store_posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'success': True}).encode())

@require_staff_auth
@require_mama_only
def create_gift(self, body):
    """POST /store/gifts - Create gift + apply + notify (mama only)."""
    required = ['storeId', 'targetUserId', 'bottleId', 'addPct', 'reason']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']
    target_user_id = body['targetUserId']
    bottle_id = body['bottleId']
    add_pct = body['addPct']
    reason = body['reason']

    if not isinstance(add_pct, int) or add_pct <= 0:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'addPct must be positive'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Verify store, user, and bottle exist
    cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    cursor.execute("SELECT id FROM users WHERE id = ?", (target_user_id,))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    cursor.execute("""
        SELECT id, remaining_pct, capacity_ml, remaining_ml FROM bottles WHERE id = ?
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
    previous_pct = bottle['remaining_pct']
    previous_ml = bottle['remaining_ml'] or 0
    capacity_ml = bottle['capacity_ml'] or 750

    # Support both addMl and addPct
    add_ml = body.get('addMl', 0)
    if add_ml:
        new_ml = min(capacity_ml, previous_ml + int(add_ml))
    else:
        new_ml = min(capacity_ml, previous_ml + int(add_pct / 100.0 * capacity_ml))

    new_pct = int(round(new_ml / capacity_ml * 100)) if capacity_ml > 0 else 0

    # Create gift
    gift_id = str(uuid.uuid4())

    cursor.execute("""
        INSERT INTO bottle_gifts (id, store_id, target_user_id, bottle_id, add_pct, add_ml, reason, status, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'applied', datetime('now'))
    """, (gift_id, store_id, target_user_id, bottle_id, add_pct, add_ml or int(add_pct / 100.0 * capacity_ml), reason))

    # Update bottle
    cursor.execute("""
        UPDATE bottles
        SET remaining_pct = ?, remaining_ml = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (new_pct, new_ml, bottle_id))

    # Log bottle history
    history_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO bottle_history (id, bottle_id, store_id, staff_id, previous_pct, new_pct, previous_ml, new_ml, change_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'gift')
    """, (history_id, bottle_id, store_id, self.staff_id, previous_pct, new_pct, previous_ml, new_ml))

    conn.commit()

    gift_row = cursor.execute("""
        SELECT id, store_id, target_user_id, bottle_id, add_pct, reason, status, applied_at
        FROM bottle_gifts
        WHERE id = ?
    """, (gift_id,)).fetchone()
    gift = dict(gift_row)

    conn.close()

    # Create notification
    create_bottle_gift_notification(target_user_id, bottle_id, gift_id)

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(gift).encode())

@require_staff_auth
def end_checkin(self, checkin_id):
    """POST /store/checkins/:id/end - End checkin."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, store_id, status FROM check_ins WHERE id = ?
    """, (checkin_id,))
    checkin_row = cursor.fetchone()

    if not checkin_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Checkin not found'}).encode())
        return

    checkin = dict(checkin_row)

    # Verify staff works at this store
    if checkin['store_id'] != self.store_id:
        conn.close()
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    # Update checkin
    cursor.execute("""
        UPDATE check_ins
        SET status = 'ended', ended_at = datetime('now')
        WHERE id = ?
    """, (checkin_id,))

    conn.commit()

    checkin_row = cursor.execute("""
        SELECT id, user_id, status, ended_at FROM check_ins WHERE id = ?
    """, (checkin_id,)).fetchone()
    checkin = dict(checkin_row)
    user_id = checkin.pop('user_id')
    checkin['userId'] = user_id

    # Get user's bottles at this store for post-checkout flow
    cursor.execute("""
        SELECT id, type, capacity_ml, remaining_pct, remaining_ml
        FROM bottles
        WHERE store_id = ? AND owner_user_id = ?
        ORDER BY created_at DESC
    """, (checkin['store_id'] if 'store_id' in checkin else self.store_id, user_id))
    bottles = []
    for b in cursor.fetchall():
        bd = dict(b)
        bd['capacityMl'] = bd.pop('capacity_ml', 750)
        bd['remainingMl'] = bd.pop('remaining_ml', 0)
        bd['remainingPct'] = bd.pop('remaining_pct', 0)
        bottles.append(bd)
    checkin['bottles'] = bottles

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(checkin).encode())

@require_staff_auth
@require_mama_only
def update_store_settings(self, body):
    """POST /store/settings - Update store settings (mama only)."""
    required = ['storeId']
    if not all(field in body for field in required):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Missing required fields'}).encode())
        return

    store_id = body['storeId']

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

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

    # Build update query
    updates = []
    params = []

    if 'logoBase64' in body:
        updates.append('logo_base64 = ?')
        params.append(body['logoBase64'])
    if 'address' in body:
        updates.append('address = ?')
        params.append(body['address'])

    # Update store
    if updates:
        params.append(store_id)
        update_sql = "UPDATE stores SET " + ", ".join(updates) + " WHERE id = ?"
        cursor.execute(update_sql, params)
        conn.commit()

    # Fetch updated store
    cursor.execute("""
        SELECT id, name, address, lat, lng, logo_base64
        FROM stores
        WHERE id = ?
    """, (store_id,))
    store_row = cursor.fetchone()
    store = dict(store_row)
    store['logoBase64'] = store.pop('logo_base64', None)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(store).encode())

@require_staff_auth
def get_store_settings(self, params):
    """GET /store/settings?storeId= - Get current store settings."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, address, lat, lng, logo_base64
        FROM stores
        WHERE id = ?
    """, (store_id,))
    store_row = cursor.fetchone()
    conn.close()

    if not store_row:
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Store not found'}).encode())
        return

    store = dict(store_row)
    store['logoBase64'] = store.pop('logo_base64', None)

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(store).encode())

@require_staff_auth
def get_customer_list(self, params):
    """GET /store/customers?storeId= - Get all customers who have ever checked in at store."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get all users who have ever checked in at this store (union with bottle owners)
    cursor.execute("""
        SELECT DISTINCT u.id, u.name, u.nickname, u.avatar_base64,
               u.birthday_month, u.birthday_day, u.birthday_public
        FROM users u
        WHERE u.id IN (
            SELECT DISTINCT user_id FROM check_ins WHERE store_id = ?
            UNION
            SELECT DISTINCT owner_user_id FROM bottles WHERE store_id = ?
        )
        ORDER BY u.name
    """, (store_id, store_id))

    customers = []
    for user_row in cursor.fetchall():
        customer = dict(user_row)

        # Count bottles
        cursor.execute("""
            SELECT COUNT(*) as count FROM bottles
            WHERE store_id = ? AND owner_user_id = ?
        """, (store_id, customer['id']))
        bottle_count = cursor.fetchone()['count']

        # Get last checkin date
        cursor.execute("""
            SELECT created_at FROM check_ins
            WHERE store_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (store_id, customer['id']))
        checkin_row = cursor.fetchone()
        last_checkin = checkin_row['created_at'] if checkin_row else None

        # Check if currently checked in
        cursor.execute("""
            SELECT COUNT(*) as count FROM check_ins
            WHERE store_id = ? AND user_id = ? AND status = 'active'
        """, (store_id, customer['id']))
        is_active = cursor.fetchone()['count'] > 0

        # Get latest memo
        cursor.execute("""
            SELECT cm.body, sa.name as staff_name, cm.created_at
            FROM customer_memos cm
            LEFT JOIN staff_accounts sa ON cm.author_staff_id = sa.id
            WHERE cm.store_id = ? AND cm.user_id = ?
            ORDER BY cm.created_at DESC
            LIMIT 1
        """, (store_id, customer['id']))
        memo_row = cursor.fetchone()
        latest_memo = None
        if memo_row:
            latest_memo = {
                'body': memo_row['body'],
                'staffName': memo_row['staff_name'] or '',
                'createdAt': memo_row['created_at'],
            }

        customer['bottleCount'] = bottle_count
        customer['lastCheckinDate'] = last_checkin
        customer['isCheckedIn'] = is_active
        customer['avatarBase64'] = customer.pop('avatar_base64', None)
        customer['latestMemo'] = latest_memo
        customer['birthdayMonth'] = customer.pop('birthday_month', None)
        customer['birthdayDay'] = customer.pop('birthday_day', None)
        customer['birthdayPublic'] = bool(customer.pop('birthday_public', 0))

        customers.append(customer)

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(customers).encode())

@require_staff_auth
def get_customer_detail(self, user_id, params):
    """GET /store/customers/:userId/detail?storeId= - Get comprehensive customer detail."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    # Verify staff works at this store
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get user profile
    cursor.execute("""
        SELECT id, name, nickname, avatar_base64, email, birthday_month, birthday_day, birthday_public, bio
        FROM users
        WHERE id = ?
    """, (user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    customer = dict(user_row)
    customer['avatarBase64'] = customer.pop('avatar_base64', None)
    customer['birthdayMonth'] = customer.pop('birthday_month', None)
    customer['birthdayDay'] = customer.pop('birthday_day', None)
    customer['birthdayPublic'] = customer.pop('birthday_public', 0)

    # Get all bottles at this store
    cursor.execute("""
        SELECT id, type, remaining_pct, capacity_ml, remaining_ml, created_at
        FROM bottles
        WHERE store_id = ? AND owner_user_id = ?
        ORDER BY created_at DESC
    """, (store_id, user_id))
    bottles = []
    for bottle_row in cursor.fetchall():
        bottle = dict(bottle_row)
        bottle['remainingPct'] = bottle.pop('remaining_pct')
        bottle['capacityMl'] = bottle.pop('capacity_ml', 750)
        bottle['remainingMl'] = bottle.pop('remaining_ml', 750)
        bottles.append(bottle)
    customer['bottles'] = bottles

    # Get bottle shares
    cursor.execute("""
        SELECT bs.id, b.id as bottle_id, b.type, u.id as shared_to_id, u.name as shared_to_name, u.nickname as shared_to_nickname
        FROM bottle_shares bs
        JOIN bottles b ON bs.bottle_id = b.id
        JOIN users u ON bs.shared_to_user_id = u.id
        WHERE bs.store_id = ? AND bs.owner_user_id = ? AND bs.active = 1
        ORDER BY bs.created_at DESC
    """, (store_id, user_id))
    shares = []
    for share_row in cursor.fetchall():
        share = dict(share_row)
        share['sharedToName'] = share.pop('shared_to_name', '')
        share['sharedToNickname'] = share.pop('shared_to_nickname', None)
        share['sharedToId'] = share.pop('shared_to_id', '')
        share['bottleId'] = share.pop('bottle_id')
        shares.append(share)
    customer['shares'] = shares

    # Get recent memos with staff names
    cursor.execute("""
        SELECT cm.id, cm.body, cm.author_staff_id, sa.name as staff_name, cm.created_at
        FROM customer_memos cm
        LEFT JOIN staff_accounts sa ON cm.author_staff_id = sa.id
        WHERE cm.store_id = ? AND cm.user_id = ?
        ORDER BY cm.created_at DESC
        LIMIT 20
    """, (store_id, user_id))
    memos = []
    for row in cursor.fetchall():
        m = dict(row)
        m['staffName'] = m.pop('staff_name', '') or ''
        m['authorStaffId'] = m.pop('author_staff_id', '')
        memos.append(m)
    customer['memos'] = memos

    # Get recent checkins (last 30)
    cursor.execute("""
        SELECT id, created_at, status, ended_at
        FROM check_ins
        WHERE store_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 30
    """, (store_id, user_id))
    checkins = []
    for row in cursor.fetchall():
        c = dict(row)
        c['checkinTime'] = c.pop('created_at')
        c['endedAt'] = c.pop('ended_at', None)
        checkins.append(c)
    customer['recentCheckins'] = checkins

    # Check if currently checked in
    cursor.execute("""
        SELECT COUNT(*) as count FROM check_ins
        WHERE store_id = ? AND user_id = ? AND status = 'active'
    """, (store_id, user_id))
    customer['isCheckedIn'] = cursor.fetchone()['count'] > 0

    # Get all share history (including ended)
    cursor.execute("""
        SELECT bs.id, bs.bottle_id, b.type as bottle_type, bs.active,
               u.id as shared_to_id, u.name as shared_to_name, u.nickname as shared_to_nickname,
               bs.created_at, bs.ended_at
        FROM bottle_shares bs
        JOIN bottles b ON bs.bottle_id = b.id
        JOIN users u ON bs.shared_to_user_id = u.id
        WHERE bs.store_id = ? AND bs.owner_user_id = ?
        ORDER BY bs.created_at DESC
    """, (store_id, user_id))
    share_history = []
    for row in cursor.fetchall():
        sh = dict(row)
        sh['bottleType'] = sh.pop('bottle_type', '')
        sh['sharedToName'] = sh.pop('shared_to_name', '')
        sh['sharedToNickname'] = sh.pop('shared_to_nickname', None)
        sh['sharedToId'] = sh.pop('shared_to_id', '')
        sh['bottleId'] = sh.pop('bottle_id')
        share_history.append(sh)
    customer['shareHistory'] = share_history

    # Get bottle history for each bottle (consumption history)
    bottle_histories = {}
    for bottle in bottles:
        cursor.execute("""
            SELECT bh.id, bh.previous_pct, bh.new_pct, bh.change_type, bh.created_at,
                   bh.previous_ml, bh.new_ml, sa.name as staff_name
            FROM bottle_history bh
            LEFT JOIN staff_accounts sa ON bh.staff_id = sa.id
            WHERE bh.bottle_id = ?
            ORDER BY bh.created_at DESC
            LIMIT 20
        """, (bottle['id'],))
        history = [dict(row) for row in cursor.fetchall()]
        bottle_histories[bottle['id']] = history
    customer['bottleHistories'] = bottle_histories

    # Get amigos at this store
    cursor.execute("""
        SELECT a.id, a.status, a.created_at, a.accepted_at,
               u_req.id as requester_id, u_req.name as requester_name, u_req.nickname as requester_nickname,
               u_tgt.id as target_id, u_tgt.name as target_name, u_tgt.nickname as target_nickname
        FROM amigos a
        JOIN users u_req ON a.requester_user_id = u_req.id
        JOIN users u_tgt ON a.target_user_id = u_tgt.id
        WHERE a.store_id = ? AND (a.requester_user_id = ? OR a.target_user_id = ?)
        ORDER BY a.created_at DESC
    """, (store_id, user_id, user_id))
    amigos = []
    for row in cursor.fetchall():
        a = dict(row)
        # Determine the "other" person
        if a['requester_id'] == user_id:
            other_name = a['target_nickname'] or a['target_name']
            other_id = a['target_id']
        else:
            other_name = a['requester_nickname'] or a['requester_name']
            other_id = a['requester_id']
        amigos.append({
            'id': a['id'],
            'otherUserId': other_id,
            'otherUserName': other_name,
            'status': a['status'],
            'createdAt': a['created_at'],
            'acceptedAt': a['accepted_at'],
        })
    customer['amigos'] = amigos

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(customer).encode())

@require_staff_auth
def get_posts(self, params):
    """GET /store/posts?storeId= - List store posts."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, type, title, body, created_at
        FROM store_posts
        WHERE store_id = ?
        ORDER BY created_at DESC
        LIMIT 30
    """, (store_id,))
    posts = [dict(row) for row in cursor.fetchall()]

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'posts': posts}).encode())


# ─── Bottle Master CRUD ───

@require_staff_auth
def get_bottle_masters(self, params):
    """GET /store/bottle-masters?storeId= - List all bottle masters for this store."""
    store_id = params.get('storeId', '')
    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, store_id, name, brand, variety, capacity_ml, image_base64, created_at
        FROM bottle_masters
        WHERE store_id = ?
        ORDER BY name
    """, (store_id,))

    masters = []
    for row in cursor.fetchall():
        m = dict(row)
        masters.append({
            'id': m['id'],
            'name': m['name'],
            'brand': m['brand'],
            'variety': m['variety'],
            'capacityMl': m['capacity_ml'],
            'imageBase64': m['image_base64'],
            'createdAt': m['created_at'],
        })

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'masters': masters}).encode())


@require_staff_auth
def create_bottle_master(self, body):
    """POST /store/bottle-masters - Create a new bottle master."""
    store_id = body.get('storeId', '')
    name = body.get('name', '').strip()

    if not store_id or not name:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId and name required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    brand = body.get('brand', '').strip() or None
    variety = body.get('variety', '').strip() or None
    capacity_ml = body.get('capacityMl', 750)
    image_base64 = body.get('imageBase64', None)

    if not isinstance(capacity_ml, int) or capacity_ml <= 0:
        capacity_ml = 750

    conn = get_connection()
    cursor = conn.cursor()

    master_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO bottle_masters (id, store_id, name, brand, variety, capacity_ml, image_base64)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (master_id, store_id, name, brand, variety, capacity_ml, image_base64))

    conn.commit()
    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'id': master_id,
        'name': name,
        'brand': brand,
        'variety': variety,
        'capacityMl': capacity_ml,
        'imageBase64': image_base64,
    }).encode())


@require_staff_auth
def update_bottle_master(self, master_id, body):
    """POST /store/bottle-masters/:id/update - Update a bottle master."""
    store_id = body.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM bottle_masters WHERE id = ? AND store_id = ?", (master_id, store_id))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Bottle master not found'}).encode())
        return

    updates = []
    params = []
    for field, col in [('name', 'name'), ('brand', 'brand'), ('variety', 'variety')]:
        if field in body:
            updates.append(f'{col} = ?')
            val = body[field]
            params.append(val.strip() if isinstance(val, str) else val)
    if 'capacityMl' in body:
        cap = body['capacityMl']
        if isinstance(cap, int) and cap > 0:
            updates.append('capacity_ml = ?')
            params.append(cap)
    if 'imageBase64' in body:
        updates.append('image_base64 = ?')
        params.append(body['imageBase64'])

    if updates:
        params.append(master_id)
        cursor.execute(f"UPDATE bottle_masters SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    # Return updated record
    cursor.execute("""
        SELECT id, name, brand, variety, capacity_ml, image_base64, created_at
        FROM bottle_masters WHERE id = ?
    """, (master_id,))
    row = cursor.fetchone()
    m = dict(row)
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'id': m['id'],
        'name': m['name'],
        'brand': m['brand'],
        'variety': m['variety'],
        'capacityMl': m['capacity_ml'],
        'imageBase64': m['image_base64'],
    }).encode())


@require_staff_auth
def delete_bottle_master(self, master_id, body):
    """POST /store/bottle-masters/:id/delete - Delete a bottle master."""
    store_id = body.get('storeId', '')

    if not store_id or store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM bottle_masters WHERE id = ? AND store_id = ?", (master_id, store_id))
    conn.commit()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'success': True}).encode())


@require_staff_auth
def get_bottle_keeps(self, params):
    """GET /store/bottle-keeps?storeId= - Get all kept bottles at this store with full details."""
    store_id = params.get('storeId', '')

    if not store_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized for this store'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Get all bottles at this store with owner info
    cursor.execute("""
        SELECT b.id, b.type, b.capacity_ml, b.remaining_ml, b.remaining_pct, b.created_at,
               u.id as owner_id, u.name as owner_name, u.nickname as owner_nickname, u.avatar_base64 as owner_avatar
        FROM bottles b
        JOIN users u ON b.owner_user_id = u.id
        WHERE b.store_id = ?
        ORDER BY b.created_at DESC
    """, (store_id,))

    bottles = []
    for row in cursor.fetchall():
        bottle = dict(row)
        bottle_id = bottle['id']

        # Active shares for this bottle
        cursor.execute("""
            SELECT bs.id, u.id as shared_to_id, u.name as shared_to_name, u.nickname as shared_to_nickname, bs.created_at
            FROM bottle_shares bs
            JOIN users u ON bs.shared_to_user_id = u.id
            WHERE bs.bottle_id = ? AND bs.active = 1
            ORDER BY bs.created_at DESC
        """, (bottle_id,))
        active_shares = []
        for s in cursor.fetchall():
            sd = dict(s)
            active_shares.append({
                'id': sd['id'],
                'sharedToId': sd['shared_to_id'],
                'sharedToName': sd['shared_to_nickname'] or sd['shared_to_name'],
                'createdAt': sd['created_at'],
            })

        # Share history (including ended)
        cursor.execute("""
            SELECT bs.id, bs.active, u.id as shared_to_id, u.name as shared_to_name, u.nickname as shared_to_nickname,
                   bs.created_at, bs.ended_at
            FROM bottle_shares bs
            JOIN users u ON bs.shared_to_user_id = u.id
            WHERE bs.bottle_id = ?
            ORDER BY bs.created_at DESC
            LIMIT 20
        """, (bottle_id,))
        share_history = []
        for s in cursor.fetchall():
            sd = dict(s)
            share_history.append({
                'id': sd['id'],
                'active': bool(sd['active']),
                'sharedToName': sd['shared_to_nickname'] or sd['shared_to_name'],
                'sharedToId': sd['shared_to_id'],
                'createdAt': sd['created_at'],
                'endedAt': sd['ended_at'],
            })

        # Consumption history (bottle_history)
        cursor.execute("""
            SELECT bh.id, bh.previous_pct, bh.new_pct, bh.previous_ml, bh.new_ml,
                   bh.change_type, bh.created_at, sa.name as staff_name
            FROM bottle_history bh
            LEFT JOIN staff_accounts sa ON bh.staff_id = sa.id
            WHERE bh.bottle_id = ?
            ORDER BY bh.created_at DESC
            LIMIT 20
        """, (bottle_id,))
        consumption = []
        for h in cursor.fetchall():
            hd = dict(h)
            consumption.append({
                'id': hd['id'],
                'previousPct': hd['previous_pct'],
                'newPct': hd['new_pct'],
                'previousMl': hd['previous_ml'],
                'newMl': hd['new_ml'],
                'changeType': hd['change_type'],
                'staffName': hd['staff_name'] or '',
                'createdAt': hd['created_at'],
            })

        bottles.append({
            'id': bottle_id,
            'type': bottle['type'],
            'capacityMl': bottle['capacity_ml'],
            'remainingMl': bottle['remaining_ml'],
            'remainingPct': bottle['remaining_pct'],
            'createdAt': bottle['created_at'],
            'ownerId': bottle['owner_id'],
            'ownerName': bottle['owner_nickname'] or bottle['owner_name'],
            'ownerAvatar': bottle['owner_avatar'],
            'activeShares': active_shares,
            'shareHistory': share_history,
            'consumption': consumption,
        })

    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'bottles': bottles}).encode())


@require_staff_auth
def store_checkin(self, body):
    """POST /store/checkins/create - Staff creates a checkin on behalf of customer."""
    store_id = body.get('storeId', '')
    user_id = body.get('userId', '')

    if not store_id or not user_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'storeId and userId required'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Check user exists
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'User not found'}).encode())
        return

    # Check if already checked in
    cursor.execute("""
        SELECT id FROM check_ins
        WHERE store_id = ? AND user_id = ? AND status = 'active'
    """, (store_id, user_id))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        self.send_response(409)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Already checked in', 'checkinId': existing['id']}).encode())
        return

    checkin_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO check_ins (id, store_id, user_id, status)
        VALUES (?, ?, ?, 'active')
    """, (checkin_id, store_id, user_id))
    conn.commit()
    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'id': checkin_id,
        'userId': user_id,
        'userName': dict(user_row)['name'],
        'status': 'active',
    }).encode())


# ========== Staff Account Master ==========

@require_staff_auth
@require_mama_only
def get_staff_accounts(self, params):
    """GET /store/staff-accounts?storeId= - List all staff accounts."""
    store_id = params.get('storeId', '')
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, role, pin, last_login_at, is_active
        FROM staff_accounts WHERE store_id = ?
        ORDER BY role ASC, name ASC
    """, (store_id,))
    rows = cursor.fetchall()
    conn.close()

    accounts = []
    for r in rows:
        accounts.append({
            'id': r['id'],
            'name': r['name'],
            'role': r['role'],
            'pin': r['pin'],
            'lastLoginAt': r['last_login_at'],
            'isActive': r['is_active'] if r['is_active'] is not None else 1,
        })

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'accounts': accounts}).encode())


@require_staff_auth
@require_mama_only
def create_staff_account(self, body):
    """POST /store/staff-accounts - Create a new staff account."""
    store_id = body.get('storeId', '')
    name = body.get('name', '').strip()
    role = body.get('role', '').strip()
    pin = body.get('pin', '').strip()

    if not store_id or not name or not role or not pin:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '名前、役割、PINは必須です'}).encode())
        return

    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    if role not in ('mama', 'bartender'):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '役割はmamaまたはbartenderです'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Check for duplicate PIN in same store
    cursor.execute("SELECT id FROM staff_accounts WHERE store_id = ? AND pin = ?", (store_id, pin))
    if cursor.fetchone():
        conn.close()
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'このPINは既に使用されています'}).encode())
        return

    account_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO staff_accounts (id, store_id, name, role, pin, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    """, (account_id, store_id, name, role, pin))
    conn.commit()
    conn.close()

    self.send_response(201)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({
        'id': account_id,
        'name': name,
        'role': role,
        'isActive': 1,
    }).encode())


@require_staff_auth
@require_mama_only
def update_staff_account(self, account_id, body):
    """POST /store/staff-accounts/:id/update - Update staff account."""
    store_id = body.get('storeId', '')
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    name = body.get('name', '').strip()
    role = body.get('role', '').strip()
    pin = body.get('pin', '').strip() or None

    if not name or not role:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '名前と役割は必須です'}).encode())
        return

    if role not in ('mama', 'bartender'):
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '役割はmamaまたはbartenderです'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Verify account belongs to this store
    cursor.execute("SELECT id FROM staff_accounts WHERE id = ? AND store_id = ?", (account_id, store_id))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'アカウントが見つかりません'}).encode())
        return

    if pin:
        # Check for duplicate PIN
        cursor.execute("SELECT id FROM staff_accounts WHERE store_id = ? AND pin = ? AND id != ?", (store_id, pin, account_id))
        if cursor.fetchone():
            conn.close()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'このPINは既に使用されています'}).encode())
            return
        cursor.execute("UPDATE staff_accounts SET name = ?, role = ?, pin = ? WHERE id = ?", (name, role, pin, account_id))
    else:
        cursor.execute("UPDATE staff_accounts SET name = ?, role = ? WHERE id = ?", (name, role, account_id))

    conn.commit()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'success': True}).encode())


@require_staff_auth
@require_mama_only
def delete_staff_account(self, account_id, body):
    """POST /store/staff-accounts/:id/delete - Delete staff account."""
    store_id = body.get('storeId', '')
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    # Cannot delete yourself
    if account_id == self.staff_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '自分自身は削除できません'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM staff_accounts WHERE id = ? AND store_id = ?", (account_id, store_id))
    if not cursor.fetchone():
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'アカウントが見つかりません'}).encode())
        return

    cursor.execute("DELETE FROM staff_accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'success': True}).encode())


@require_staff_auth
@require_mama_only
def toggle_staff_account_active(self, account_id, body):
    """POST /store/staff-accounts/:id/toggle-active - Toggle active state."""
    store_id = body.get('storeId', '')
    if store_id != self.store_id:
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
        return

    # Cannot disable yourself
    if account_id == self.staff_id:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': '自分自身は無効化できません'}).encode())
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT is_active FROM staff_accounts WHERE id = ? AND store_id = ?", (account_id, store_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'アカウントが見つかりません'}).encode())
        return

    current = row['is_active'] if row['is_active'] is not None else 1
    new_val = 0 if current == 1 else 1
    cursor.execute("UPDATE staff_accounts SET is_active = ? WHERE id = ?", (new_val, account_id))
    conn.commit()
    conn.close()

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps({'isActive': new_val}).encode())
