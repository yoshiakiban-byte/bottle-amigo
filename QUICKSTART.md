# Bottle Amigo BFF - Quick Start Guide

## Installation (Already Done!)

Everything is set up. Just verify and run:

```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo
```

## Start the Server

```bash
python3 bff/server.py
```

Server runs on **http://localhost:3001**

## Quick Test

### 1. Login (get a token)
```bash
curl -X POST http://localhost:3001/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tanaka@example.com","password":"password123"}'
```

Response:
```json
{
  "token": "eyJ0eXA...",
  "user": {
    "id": "5ee0c68c...",
    "name": "田中太郎",
    "email": "tanaka@example.com"
  }
}
```

### 2. Use the token to get bottles
```bash
TOKEN="eyJ0eXA..."  # Copy from above response

curl -X GET http://localhost:3001/consumer/bottles \
  -H "Authorization: Bearer $TOKEN"
```

Response: Array of bottle objects with type, remaining_pct, etc.

### 3. Staff login
```bash
curl -X POST http://localhost:3001/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"storeId":"<store-uuid>","pin":"1234"}'
```

Mama PIN: **1234** (can do everything)
Bartender PIN: **5678** (read-only)

## Demo Credentials

### Users (password: password123)
- tanaka@example.com - 田中太郎
- suzuki@example.com - 鈴木花子
- sato@example.com - 佐藤健一

### Staff
- Mama PIN: 1234 (mama role)
- Bartender PIN: 5678 (bartender role)

## Core Endpoints

### Authentication
```
POST /auth/user/register      - Create account
POST /auth/user/login         - Login user
POST /auth/staff/login        - Login staff
```

### Consumer (User)
```
GET  /consumer/bottles        - List bottles
GET  /consumer/bottles/:id    - Bottle detail
GET  /consumer/stores/:id     - Store info
POST /consumer/checkins       - Check in
GET  /consumer/amigos         - List friends
POST /consumer/shares         - Share bottle
GET  /consumer/notifications  - Get messages
```

### Store (Staff)
```
GET  /store/checkins/active           - Active checkins
GET  /store/customers/:id/summary     - Customer info
POST /store/bottles/:id/updateRemainingPct  - Update %
POST /store/posts                     - Announce
POST /store/gifts                     - Give gift (mama)
```

## Features

- ✅ User authentication with JWT (24hr)
- ✅ Password hashing with bcrypt
- ✅ Role-based access (mama/bartender)
- ✅ Bottle tracking and sharing
- ✅ User relationships (amigos)
- ✅ Store posts and notifications
- ✅ Automatic notification system
- ✅ CORS support
- ✅ Full RESTful API
- ✅ SQLite persistence

## Database

- Located at: `/tmp/bottle_amigo.db`
- 12 tables with full schema
- Auto-created on first run
- Demo data pre-loaded

## Full Documentation

See **README.md** for complete API documentation with all endpoints and examples.

## Testing

```bash
# Run automated tests
bash test_api.sh

# Verify installation
python3 verify_installation.py
```

## Next Steps

1. **Start server**: `python3 bff/server.py`
2. **Login**: Get a token with your email/password
3. **Explore API**: Use token in Authorization header
4. **Try endpoints**: See README.md for all options
5. **Build UI**: Connect your frontend to localhost:3001

## Architecture

```
HTTP Server (http.server)
    ↓
Server.py (Router)
    ↓
Routes (auth.py, consumer.py, store.py)
    ↓
Middleware (JWT auth, role checks)
    ↓
Services (Notifications, business logic)
    ↓
Database (SQLite3)
```

## Environment

- Python: 3.10.12
- Database: SQLite3
- Libraries: bcrypt 3.2.0, PyJWT 2.3.0
- Port: 3001
- CORS: Enabled for all origins

## Common Tasks

### Register new user
```bash
curl -X POST http://localhost:3001/auth/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"New User",
    "email":"new@example.com",
    "password":"password123"
  }'
```

### Create checkin
```bash
curl -X POST http://localhost:3001/consumer/checkins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId":"<store-uuid>",
    "notifyToUserIds":["<user-id-1>"]
  }'
```

### Create store post
```bash
curl -X POST http://localhost:3001/store/posts \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId":"<store-uuid>",
    "type":"message",
    "body":"Welcome everyone!",
    "title":"Welcome Post"
  }'
```

## Support

- All endpoints return JSON
- Errors include status codes: 400, 401, 403, 404, 500
- Check server logs for detailed errors
- Read README.md for complete endpoint reference
