import hmac
import hashlib
import json
import base64
import time

SECRET_KEY = 'bottle-amigo-secret-key-2024'

def generate_token(payload):
    """Generate a token using HMAC-based approach."""
    payload['exp'] = int(time.time()) + 86400  # 24h
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token):
    """Verify and decode a token."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def require_user_auth(handler):
    """Decorator to require user authentication."""
    def wrapper(self, *args, **kwargs):
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Missing or invalid authorization header'}).encode())
            return

        token = auth_header[7:]  # Remove 'Bearer ' prefix
        payload = verify_token(token)
        if not payload or payload.get('type') != 'user':
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid token'}).encode())
            return

        self.user_id = payload.get('userId')
        return handler(self, *args, **kwargs)

    return wrapper

def require_staff_auth(handler):
    """Decorator to require staff authentication."""
    def wrapper(self, *args, **kwargs):
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Missing or invalid authorization header'}).encode())
            return

        token = auth_header[7:]  # Remove 'Bearer ' prefix
        payload = verify_token(token)
        if not payload or payload.get('type') != 'staff':
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid token'}).encode())
            return

        self.staff_id = payload.get('staffId')
        self.store_id = payload.get('storeId')
        self.staff_role = payload.get('role')
        return handler(self, *args, **kwargs)

    return wrapper

def require_mama_only(handler):
    """Decorator to require mama role."""
    def wrapper(self, *args, **kwargs):
        if self.staff_role != 'mama':
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Only mama can perform this action'}).encode())
            return

        return handler(self, *args, **kwargs)

    return wrapper
