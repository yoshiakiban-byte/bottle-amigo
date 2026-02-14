# Bottle Amigo BFF Server

A complete Python backend-for-frontend (BFF) server for the Bottle Amigo app built with the standard library HTTP server.

## Architecture

```
bottle-amigo/
├── bff/
│   ├── server.py          # Main HTTP server with routing
│   ├── db.py              # SQLite database setup
│   ├── seed.py            # Demo data seeding
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py        # User registration, login, staff login
│   │   ├── consumer.py    # Consumer API endpoints
│   │   └── store.py       # Store/staff API endpoints
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py        # JWT authentication & decorators
│   └── services/
│       ├── __init__.py
│       └── notification.py # Notification generation logic
└── bottle_amigo.db        # SQLite database (created on first run)
```

## Quick Start

### 1. Initialize Database with Demo Data

```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo
python3 bff/seed.py
```

This creates the database and seeds it with:
- 1 store: "Bar Sakura" in Tokyo
- 2 staff: Mama and Bartender with PINs
- 3 users: Tanaka, Suzuki, Sato (all password: "password123")
- 2 bottles: Tanaka's 焼酎 (60%), Suzuki's ウイスキー (80%)
- 1 active amigo relationship: Tanaka ↔ Suzuki
- 1 today's shift with message

### 2. Start the Server

```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo
python3 bff/server.py
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication

#### Register User
```
POST /auth/user/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

Response: { "token": "...", "user": { "id", "name", "email" } }
```

#### Login User
```
POST /auth/user/login
Content-Type: application/json

{
  "email": "tanaka@example.com",
  "password": "password123"
}

Response: { "token": "...", "user": { "id", "name", "email" } }
```

#### Login Staff
```
POST /auth/staff/login
Content-Type: application/json

{
  "storeId": "store-uuid",
  "pin": "1234"
}

Response: { "token": "...", "staff": { "id", "name", "role", "storeId" } }
```

### Consumer Endpoints (Require User JWT)

All consumer endpoints require `Authorization: Bearer <token>` header

#### Get User's Bottles
```
GET /consumer/bottles
Response: [{ "id", "store_id", "owner_user_id", "type", "remaining_pct", ... }]
```

#### Get Bottle Detail
```
GET /consumer/bottles/:bottleId
Response: { "id", "store_id", "type", "remaining_pct", "owner", "store", "shares" }
```

#### Get Store Detail
```
GET /consumer/stores/:storeId
Response: { "id", "name", "address", "lat", "lng", "todayShift", "recentPosts" }
```

#### Create Checkin
```
POST /consumer/checkins
{
  "storeId": "store-uuid",
  "notifyToUserIds": ["user-id-1", "user-id-2"]
}
Response: { "id", "store_id", "user_id", "notify_to_user_ids", "status", "user" }
```

#### Get Amigos for Store
```
GET /consumer/amigos?storeId=store-uuid
Response: [{ "id", "requester_user_id", "target_user_id", "status", "user" }]
```

#### Request Amigo
```
POST /consumer/amigos/request
{
  "storeId": "store-uuid",
  "targetUserId": "user-uuid"
}
Response: { "id", "requester_user_id", "target_user_id", "status" }
```

#### Accept Amigo Request
```
POST /consumer/amigos/:amigoId/accept
Response: { "id", "status", "accepted_at" }
```

#### Create Bottle Share
```
POST /consumer/shares
{
  "bottleId": "bottle-uuid",
  "sharedToUserId": "user-uuid"
}
Response: { "id", "bottle_id", "shared_to_user_id", "active", "created_at" }
```

#### End Bottle Share
```
POST /consumer/shares/:shareId/end
Response: { "id", "active", "ended_at" }
```

#### Get Notifications
```
GET /consumer/notifications
Response: [{ "id", "type", "payload", "created_at", "read_at" }]
```

#### Search Users
```
GET /consumer/users/search?q=john&storeId=store-uuid
Response: [{ "id", "name", "email" }]
```

### Store Endpoints (Require Staff JWT)

All store endpoints require `Authorization: Bearer <token>` header with staff token

#### Get Active Checkins
```
GET /store/checkins/active?storeId=store-uuid
Response: [{ "id", "user_id", "user", "bottles", "status", ... }]
```

#### Get Customer Summary
```
GET /store/customers/:userId/summary?storeId=store-uuid
Response: {
  "user": { "id", "name", "email" },
  "bottles": [...],
  "activeShares": [...],
  "recentMemos": [...]
}
```

#### Update Bottle Remaining %
```
POST /store/bottles/:bottleId/updateRemainingPct
{
  "remainingPct": 45
}
Response: { "id", "remaining_pct", "updated_at" }
```

#### Refill Bottle to Full (Mama Only)
```
POST /store/bottles/:bottleId/refillToFull
Response: { "id", "remaining_pct": 100, "updated_at" }
```

#### Add New Bottle (Mama Only)
```
POST /store/bottles/addNew
{
  "storeId": "store-uuid",
  "ownerUserId": "user-uuid",
  "type": "焼酎"
}
Response: { "id", "store_id", "owner_user_id", "type", "remaining_pct", ... }
```

#### Create Memo
```
POST /store/memos
{
  "storeId": "store-uuid",
  "userId": "user-uuid",
  "body": "Customer note here"
}
Response: { "id", "store_id", "user_id", "author_staff_id", "body", "created_at" }
```

#### Create Store Post
```
POST /store/posts
{
  "storeId": "store-uuid",
  "type": "event|message|staff",
  "body": "Post content",
  "title": "Optional title"
}
Response: { "id", "store_id", "type", "title", "body", "created_at" }
```

#### Create Gift (Mama Only)
```
POST /store/gifts
{
  "storeId": "store-uuid",
  "targetUserId": "user-uuid",
  "bottleId": "bottle-uuid",
  "addPct": 20,
  "reason": "Birthday gift"
}
Response: { "id", "store_id", "target_user_id", "bottle_id", "add_pct", "reason", "status", "applied_at" }
```

#### End Checkin
```
POST /store/checkins/:checkinId/end
Response: { "id", "status": "ended", "ended_at" }
```

## Database Schema

The server uses SQLite with the following tables:

- **users**: User accounts with email & hashed passwords
- **stores**: Bar locations with coordinates
- **staff_accounts**: Staff members with PIN authentication
- **bottles**: Bottles with owner, type, and remaining percentage
- **bottle_shares**: Active bottle shares between users
- **bottle_gifts**: Gift transactions with percentage additions
- **amigos**: Friendship relationships with accept/pending status
- **check_ins**: User checkins with notification lists
- **customer_memos**: Staff notes about customers
- **store_staff_shifts**: Daily staff assignments & messages
- **store_posts**: Store announcements and updates
- **notifications**: User notifications with JSON payload

## Authentication

### JWT Tokens

- **Secret**: "bottle-amigo-secret-key-2026"
- **Expiry**: 24 hours
- **User Token Payload**: `{ userId, type: "user" }`
- **Staff Token Payload**: `{ staffId, storeId, role, type: "staff" }`

### Password Hashing

Passwords are hashed using bcrypt before storage.

## CORS

All endpoints support CORS with `Access-Control-Allow-Origin: *` for MVP.

## Notification System

Notifications are automatically created for:

1. **Amigo Checkin** (`amigo_checkin`): When user checks in, notifies selected amigos
2. **Store Post** (`store_post`): When staff creates post, notifies all bottle holders
3. **Bottle Share** (`bottle_share`): When bottle is shared, notifies recipient
4. **Bottle Gift** (`bottle_gift`): When gift is applied, notifies target user

## Demo Users

**Users**:
- 田中太郎 (tanaka@example.com) - password: password123
- 鈴木花子 (suzuki@example.com) - password: password123
- 佐藤健一 (sato@example.com) - password: password123

**Staff**:
- Mama (さくらママ) - PIN: 1234
- Bartender (タカシ) - PIN: 5678

**Store**:
- Bar Sakura (バー さくら) - 東京都渋谷区道玄坂2-10-7

## Testing

### Test Login
```bash
curl -X POST http://localhost:3001/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tanaka@example.com","password":"password123"}'
```

### Test Protected Endpoint
```bash
TOKEN="<token-from-login>"
curl -X GET http://localhost:3001/consumer/bottles \
  -H "Authorization: Bearer $TOKEN"
```

### Test Staff Login
```bash
curl -X POST http://localhost:3001/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"storeId":"<store-id>","pin":"1234"}'
```

## Implementation Details

- Uses Python 3.10 standard library only (http.server, sqlite3, jwt, bcrypt)
- No external package installation required
- Manual URL path parsing with urllib.parse
- JSON request/response handling
- Decorator-based authentication middleware
- Service layer for notification logic
- Transaction-based database operations
- Proper HTTP status codes (200, 201, 400, 401, 403, 404)
- UUID4 for all entity IDs
- ISO 8601 timestamps stored in SQLite

## Database Location

- Default: `/tmp/bottle_amigo.db` (for permission flexibility)
- Can be changed in `bff/db.py` by modifying `DB_PATH`
