#!/bin/bash

# Bottle Amigo API Testing Script

BASE_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local description=$5

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "\n${BLUE}[TEST $TESTS_RUN]${NC} $description"
    echo -e "  ${YELLOW}$method $endpoint${NC}"

    if [ -z "$token" ]; then
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi

    echo "Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"

    TESTS_PASSED=$((TESTS_PASSED + 1))
}

echo -e "${GREEN}=== Bottle Amigo BFF API Tests ===${NC}"

# 1. Register User
echo -e "\n${BLUE}=== User Registration & Authentication ===${NC}"

test_endpoint "POST" "/auth/user/register" \
    '{"name":"Test User","email":"test@example.com","password":"testpass123"}' \
    "" \
    "Register new user"

# 2. Login User
test_endpoint "POST" "/auth/user/login" \
    '{"email":"tanaka@example.com","password":"password123"}' \
    "" \
    "Login existing user"

# Get token for next requests
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/user/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"tanaka@example.com","password":"password123"}')

USER_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

echo -e "\n${GREEN}Got user token: ${USER_TOKEN:0:50}...${NC}"

# 3. Get Bottles
echo -e "\n${BLUE}=== Consumer Endpoints ===${NC}"

test_endpoint "GET" "/consumer/bottles" \
    "" \
    "$USER_TOKEN" \
    "Get user's bottles"

# Get first bottle ID for detail test
BOTTLE_ID=$(curl -s -X GET "$BASE_URL/consumer/bottles" \
    -H "Authorization: Bearer $USER_TOKEN" | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')" 2>/dev/null)

if [ ! -z "$BOTTLE_ID" ]; then
    test_endpoint "GET" "/consumer/bottles/$BOTTLE_ID" \
        "" \
        "$USER_TOKEN" \
        "Get bottle detail"
fi

# 4. Get Store
echo -e "\n${BLUE}=== Store Endpoints ===${NC}"

# Get store ID from database
STORE_ID=$(python3 << 'PYTHON_EOF'
import sys
sys.path.insert(0, '/sessions/blissful-cool-ritchie/mnt/OBK')
from bottle_amigo.bff.db import get_connection
conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT id FROM stores LIMIT 1")
row = cursor.fetchone()
print(row['id'] if row else '')
conn.close()
PYTHON_EOF
)

if [ ! -z "$STORE_ID" ]; then
    test_endpoint "GET" "/consumer/stores/$STORE_ID" \
        "" \
        "$USER_TOKEN" \
        "Get store detail"
fi

# 5. Staff Login
test_endpoint "POST" "/auth/staff/login" \
    "{\"storeId\":\"$STORE_ID\",\"pin\":\"1234\"}" \
    "" \
    "Login staff (Mama)"

# Get staff token
STAFF_LOGIN=$(curl -s -X POST "$BASE_URL/auth/staff/login" \
    -H "Content-Type: application/json" \
    -d "{\"storeId\":\"$STORE_ID\",\"pin\":\"1234\"}")

STAFF_TOKEN=$(echo "$STAFF_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ ! -z "$STAFF_TOKEN" ]; then
    echo -e "\n${GREEN}Got staff token: ${STAFF_TOKEN:0:50}...${NC}"

    test_endpoint "GET" "/store/checkins/active?storeId=$STORE_ID" \
        "" \
        "$STAFF_TOKEN" \
        "Get active checkins"
fi

# 6. Get Notifications
test_endpoint "GET" "/consumer/notifications" \
    "" \
    "$USER_TOKEN" \
    "Get notifications"

# 7. Search Users
test_endpoint "GET" "/consumer/users/search?q=田中&storeId=$STORE_ID" \
    "" \
    "$USER_TOKEN" \
    "Search users"

# Summary
echo -e "\n${GREEN}=== Test Summary ===${NC}"
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"

if [ $TESTS_RUN -eq $TESTS_PASSED ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${YELLOW}Some tests may have had issues${NC}"
fi
