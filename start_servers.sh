#!/bin/bash
# Start all Bottle Amigo servers with auto-restart
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo

# Kill any existing servers
pkill -f "python3 bff/server.py" 2>/dev/null
pkill -f "http.server 3000" 2>/dev/null
pkill -f "http.server 3002" 2>/dev/null
sleep 1

# Start BFF server (port 3001)
while true; do
    python3 bff/server.py >> /tmp/bff.log 2>&1
    echo "[$(date)] BFF crashed, restarting..." >> /tmp/bff.log
    sleep 1
done &
BFF_PID=$!

# Start Consumer static server (port 3000)
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/consumer
while true; do
    python3 -m http.server 3000 >> /tmp/consumer.log 2>&1
    echo "[$(date)] Consumer server crashed, restarting..." >> /tmp/consumer.log
    sleep 1
done &
CONSUMER_PID=$!

# Start Store static server (port 3002)
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store
while true; do
    python3 -m http.server 3002 >> /tmp/store.log 2>&1
    echo "[$(date)] Store server crashed, restarting..." >> /tmp/store.log
    sleep 1
done &
STORE_PID=$!

echo "All servers started:"
echo "  BFF (3001): wrapper PID $BFF_PID"
echo "  Consumer (3000): wrapper PID $CONSUMER_PID"
echo "  Store (3002): wrapper PID $STORE_PID"

# Wait for any to exit
wait
