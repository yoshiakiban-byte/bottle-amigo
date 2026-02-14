import uuid
import json
from bff.db import get_connection

def create_amigo_checkin_notification(user_id, store_id, checkin_id):
    """Create amigo checkin notifications for selected users."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get the checkin to find notify_to_user_ids
    cursor.execute("SELECT notify_to_user_ids FROM check_ins WHERE id = ?", (checkin_id,))
    checkin_row = cursor.fetchone()
    if not checkin_row:
        conn.close()
        return

    notify_to_user_ids = json.loads(checkin_row['notify_to_user_ids'])

    # Create notification for each user
    for target_user_id in notify_to_user_ids:
        notification_id = str(uuid.uuid4())
        payload = json.dumps({
            'user_id': user_id,
            'store_id': store_id,
            'checkin_id': checkin_id
        })
        cursor.execute("""
            INSERT INTO notifications (id, user_id, type, payload_json)
            VALUES (?, ?, ?, ?)
        """, (notification_id, target_user_id, 'amigo_checkin', payload))

    conn.commit()
    conn.close()

def create_store_post_notification(store_id, post_id, post_type):
    """Create notifications for all bottle holders at the store."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get store name
    cursor.execute("SELECT name FROM stores WHERE id = ?", (store_id,))
    store_row = cursor.fetchone()
    store_name = store_row['name'] if store_row else ''

    # Get post content
    cursor.execute("SELECT title, body FROM store_posts WHERE id = ?", (post_id,))
    post_row = cursor.fetchone()
    post_content = ''
    if post_row:
        post_content = post_row['title'] or post_row['body'] or ''

    # Get all users with bottles at this store
    cursor.execute("""
        SELECT DISTINCT owner_user_id FROM bottles WHERE store_id = ?
    """, (store_id,))
    rows = cursor.fetchall()
    user_ids = [row['owner_user_id'] for row in rows]

    # Create notification for each user
    for user_id in user_ids:
        notification_id = str(uuid.uuid4())
        payload = json.dumps({
            'store_id': store_id,
            'post_id': post_id,
            'post_type': post_type,
            'storeName': store_name,
            'content': post_content
        })
        cursor.execute("""
            INSERT INTO notifications (id, user_id, type, payload_json)
            VALUES (?, ?, ?, ?)
        """, (notification_id, user_id, 'store_post', payload))

    conn.commit()
    conn.close()

def create_bottle_share_notification(shared_to_user_id, bottle_id, share_id):
    """Create notification for bottle share recipient."""
    conn = get_connection()
    cursor = conn.cursor()

    notification_id = str(uuid.uuid4())
    payload = json.dumps({
        'bottle_id': bottle_id,
        'share_id': share_id
    })
    cursor.execute("""
        INSERT INTO notifications (id, user_id, type, payload_json)
        VALUES (?, ?, ?, ?)
    """, (notification_id, shared_to_user_id, 'bottle_share', payload))

    conn.commit()
    conn.close()

def create_bottle_gift_notification(target_user_id, bottle_id, gift_id):
    """Create notification for bottle gift."""
    conn = get_connection()
    cursor = conn.cursor()

    notification_id = str(uuid.uuid4())
    payload = json.dumps({
        'bottle_id': bottle_id,
        'gift_id': gift_id
    })
    cursor.execute("""
        INSERT INTO notifications (id, user_id, type, payload_json)
        VALUES (?, ?, ?, ?)
    """, (notification_id, target_user_id, 'bottle_gift', payload))

    conn.commit()
    conn.close()
