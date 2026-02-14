#!/bin/bash
# Bottle Amigo - 停止スクリプト
pkill -f "python3 bff/server.py" 2>/dev/null
pkill -f "python3 -m http.server 300" 2>/dev/null
echo "🛑 Bottle Amigo を停止しました"
