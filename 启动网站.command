#!/bin/bash
# 双击启动 SafeBite 本地网站
cd "$(dirname "$0")"
PORT=8787
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "网站已经在运行： http://localhost:$PORT"
else
    nohup node server.js >/tmp/safebite-server.log 2>&1 &
    sleep 1
    echo "✅ SafeBite 已启动： http://localhost:$PORT"
    echo "   后台： http://localhost:$PORT/admin/"
fi
echo ""
echo "关闭网站：在终端运行  lsof -ti:$PORT | xargs kill"
sleep 3
open "http://localhost:$PORT"
