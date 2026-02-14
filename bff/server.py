#!/usr/bin/env python3
import json
import sys
import os
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add parent directory to path to allow bff imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from bff.routes import auth, consumer, store
from bff.db import init_db, migrate_db, DB_PATH

# Project root (parent of bff/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# MIME type mappings
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

class BFFHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Override to log with custom format."""
        print(f"[{self.client_address[0]}] {format % args}", file=sys.stderr)

    def serve_static_file(self, file_path, fallback_index=None):
        """Serve a static file from the filesystem."""
        # Security: prevent directory traversal
        file_path = os.path.normpath(file_path)
        if not file_path.startswith(PROJECT_ROOT):
            self.send_response(403)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Forbidden')
            return

        # If path is a directory, try index.html
        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'index.html')

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(content)
            except Exception:
                self.send_response(500)
                self.end_headers()
        elif fallback_index and os.path.isfile(fallback_index):
            # SPA fallback: serve index.html for client-side routing
            with open(fallback_index, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Not Found')

    def is_api_route(self, path):
        """Check if path is an API route (not static file)."""
        api_prefixes = ('/auth/', '/consumer/', '/store/')
        return any(path.startswith(p) for p in api_prefixes)

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        # CORS headers are already added by send_response override
        self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)

        # Convert query params from lists to single values
        params = {k: v[0] if v else '' for k, v in query_params.items()}

        # Add CORS headers
        self.send_header_cors = True

        print(f"[DEBUG GET] path='{path}' full='{self.path}'", file=sys.stderr)

        try:
            # Auth routes
            if path == '/auth/user/register':
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Method not allowed'}).encode())

            elif path == '/auth/user/login':
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Method not allowed'}).encode())

            elif path == '/auth/staff/login':
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Method not allowed'}).encode())

            # Consumer routes
            elif path == '/consumer/bottles':
                consumer.get_bottles(self)

            elif path.startswith('/consumer/bottles/') and path.count('/') == 3:
                bottle_id = path.split('/')[-1]
                consumer.get_bottle_detail(self, bottle_id)

            elif path.startswith('/consumer/stores/') and path.count('/') == 3:
                store_id = path.split('/')[-1]
                consumer.get_store_detail(self, store_id)

            elif path == '/consumer/checkins':
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Method not allowed'}).encode())

            elif path == '/consumer/amigos' or (path.startswith('/consumer/amigos') and '?' in self.path):
                consumer.get_amigos(self, params)

            elif path == '/consumer/notifications':
                consumer.get_notifications(self)

            elif path == '/consumer/profile':
                consumer.get_profile(self)

            elif path == '/consumer/home':
                consumer.get_home(self)

            elif path.startswith('/consumer/users/search'):
                consumer.search_users(self, params)

            elif path.startswith('/consumer/users/') and not path.endswith('/search'):
                user_id = path.split('/')[-1]
                consumer.get_user_profile(self, user_id)

            elif path == '/consumer/checkins/active':
                consumer.get_active_checkin(self)

            elif path == '/consumer/amigos/myqr':
                consumer.get_amigo_qr_token(self)

            elif path == '/consumer/shares':
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Method not allowed'}).encode())

            # Store routes
            elif path.startswith('/store/checkins/active'):
                store.get_active_checkins(self, params)

            elif path.startswith('/store/customers/') and '/summary' in path:
                parts = path.split('/')
                user_id = parts[3]
                store.get_customer_summary(self, user_id, params)

            elif path == '/store/customers' or (path == '/store/customers' and '?' in self.path):
                store.get_customer_list(self, params)

            elif path == '/store/posts':
                store.get_posts(self, params)

            elif path.startswith('/store/customers/') and '/detail' in path:
                parts = path.split('/')
                user_id = parts[3]
                store.get_customer_detail(self, user_id, params)

            elif path == '/store/settings':
                store.get_store_settings(self, params)

            elif path == '/store/bottle-masters':
                store.get_bottle_masters(self, params)

            elif path == '/store/bottle-keeps':
                store.get_bottle_keeps(self, params)

            elif path == '/store/staff-accounts':
                store.get_staff_accounts(self, params)

            else:
                # Not an API route → serve static files
                self.serve_static(path)

        except Exception as e:
            print(f"Error in GET handler: {str(e)}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Internal server error'}).encode())

    def serve_static(self, path):
        """Route static file requests to consumer or store directories."""
        if path.startswith('/staff'):
            # Store (staff) app: /staff/ → store/
            rel_path = path[len('/staff'):]
            if not rel_path or rel_path == '/':
                rel_path = '/index.html'
            file_path = os.path.join(PROJECT_ROOT, 'store', rel_path.lstrip('/'))
            fallback = os.path.join(PROJECT_ROOT, 'store', 'index.html')
        else:
            # Consumer app: / → consumer/
            rel_path = path
            if not rel_path or rel_path == '/':
                rel_path = '/index.html'
            file_path = os.path.join(PROJECT_ROOT, 'consumer', rel_path.lstrip('/'))
            fallback = os.path.join(PROJECT_ROOT, 'consumer', 'index.html')

        self.serve_static_file(file_path, fallback_index=fallback)

    def do_POST(self):
        """Handle POST requests."""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)

        # Convert query params from lists to single values
        params = {k: v[0] if v else '' for k, v in query_params.items()}

        # Read body
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length)
        body = {}
        if body_bytes:
            try:
                body = json.loads(body_bytes.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
                return

        try:
            # Auth routes
            if path == '/auth/user/register':
                auth.user_register(self, body)

            elif path == '/auth/user/login':
                auth.user_login(self, body)

            elif path == '/auth/staff/login':
                auth.staff_login(self, body)

            # Consumer routes
            elif path == '/consumer/checkins':
                consumer.create_checkin(self, body)

            elif path == '/consumer/amigos/request':
                consumer.request_amigo(self, body)

            elif path == '/consumer/amigos/scan':
                consumer.amigo_scan_qr(self, body)

            elif path.startswith('/consumer/amigos/') and path.endswith('/accept'):
                amigo_id = path.split('/')[-2]
                consumer.accept_amigo(self, amigo_id)

            elif path == '/consumer/profile':
                consumer.update_profile(self, body)

            elif path == '/consumer/shares':
                consumer.create_bottle_share(self, body)

            elif path.startswith('/consumer/shares/') and path.endswith('/end'):
                share_id = path.split('/')[-2]
                consumer.end_bottle_share(self, share_id)

            # Store routes
            elif path == '/store/settings':
                store.update_store_settings(self, body)
            elif path.startswith('/store/bottles/') and path.endswith('/updateRemainingPct'):
                bottle_id = path.split('/')[-2]
                store.update_bottle_remaining_pct(self, bottle_id, body)

            elif path.startswith('/store/bottles/') and path.endswith('/refillToFull'):
                bottle_id = path.split('/')[-2]
                store.refill_bottle_to_full(self, bottle_id)

            elif path == '/store/bottles/addNew':
                store.add_new_bottle(self, body)

            elif path == '/store/memos':
                store.create_memo(self, body)

            elif path == '/store/posts':
                store.create_post(self, body)

            elif path.startswith('/store/posts/') and path.endswith('/update'):
                post_id = path.split('/')[-2]
                store.update_post(self, post_id, body)

            elif path.startswith('/store/posts/') and path.endswith('/delete'):
                post_id = path.split('/')[-2]
                store.delete_post(self, post_id, body)

            elif path == '/store/gifts':
                store.create_gift(self, body)

            elif path == '/store/bottle-masters':
                store.create_bottle_master(self, body)

            elif path.startswith('/store/bottle-masters/') and path.endswith('/update'):
                master_id = path.split('/')[-2]
                store.update_bottle_master(self, master_id, body)

            elif path.startswith('/store/bottle-masters/') and path.endswith('/delete'):
                master_id = path.split('/')[-2]
                store.delete_bottle_master(self, master_id, body)

            elif path == '/store/checkins/create':
                store.store_checkin(self, body)

            elif path.startswith('/store/checkins/') and path.endswith('/end'):
                checkin_id = path.split('/')[-2]
                store.end_checkin(self, checkin_id)

            elif path == '/store/staff-accounts':
                store.create_staff_account(self, body)

            elif path.startswith('/store/staff-accounts/') and path.endswith('/update'):
                account_id = path.split('/')[-2]
                store.update_staff_account(self, account_id, body)

            elif path.startswith('/store/staff-accounts/') and path.endswith('/delete'):
                account_id = path.split('/')[-2]
                store.delete_staff_account(self, account_id, body)

            elif path.startswith('/store/staff-accounts/') and path.endswith('/toggle-active'):
                account_id = path.split('/')[-2]
                store.toggle_staff_account_active(self, account_id, body)

            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Not found'}).encode())

        except Exception as e:
            print(f"Error in POST handler: {str(e)}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Internal server error'}).encode())

    def send_response(self, code, message=None):
        """Override to add CORS headers."""
        super().send_response(code, message)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

def run_server(port=3001):
    """Run the HTTP server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, BFFHandler)
    print(f"Bottle Amigo BFF Server running on port {port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    # Clear __pycache__ to avoid stale .pyc issues
    import glob
    bff_dir = os.path.dirname(__file__)
    for pyfile in glob.glob(os.path.join(bff_dir, '**', '*.py'), recursive=True):
        base = os.path.splitext(os.path.basename(pyfile))[0]
        pycdir = os.path.join(os.path.dirname(pyfile), '__pycache__')
        if os.path.exists(pycdir):
            import py_compile
            for m in glob.glob(os.path.join(pycdir, base + '.cpython-*.pyc')):
                try:
                    py_compile.compile(pyfile, m, doraise=True)
                except Exception:
                    pass

    # Initialize database and seed if needed
    import sqlite3
    print(f"[STARTUP] DB_PATH = {DB_PATH}")
    print(f"[STARTUP] DB_PATH absolute = {os.path.abspath(DB_PATH)}")
    print(f"[STARTUP] DB exists = {os.path.exists(DB_PATH)}")
    if os.path.exists(DB_PATH):
        print(f"[STARTUP] DB size = {os.path.getsize(DB_PATH)} bytes")

    needs_seed = True
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM stores")
            store_count = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM users")
            user_count = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM bottles")
            bottle_count = c.fetchone()[0]
            conn.close()
            print(f"[STARTUP] stores={store_count} users={user_count} bottles={bottle_count}")
            if store_count > 0:
                needs_seed = False
                print("[STARTUP] Database already has data, skipping seed.")
        except Exception as e:
            print(f"[STARTUP] DB check error: {e}")
            needs_seed = True

    init_db()
    migrate_db()
    if needs_seed:
        print("[STARTUP] Running seed...")
        try:
            from bff.seed import seed_data
            seed_data()
        except Exception as e:
            print(f"Seed error (non-fatal): {e}", file=sys.stderr)

    # Verify DB state after init
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM users")
        print(f"[STARTUP] Final user count: {c.fetchone()[0]}")
        c.execute("SELECT name FROM users")
        names = [r[0] for r in c.fetchall()]
        print(f"[STARTUP] Users: {names}")
        conn.close()
    except Exception as e:
        print(f"[STARTUP] Final check error: {e}")

    # Run server
    port = int(os.environ.get('PORT', 3001))
    run_server(port)
