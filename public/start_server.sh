#!/bin/bash
# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Choose a port (default 8080, can be passed as argument)
PORT=${1:-8080}

echo "Starting hierarchy visualizer on port $PORT..."
echo "Access it at: http://$(hostname):$PORT"

# Check if python3 is available
if command -v python3 &>/dev/null; then
    nohup python3 -m http.server $PORT > server.log 2>&1 &
    PID=$!
    echo "Server running with PID: $PID"
    echo "Log file: $DIR/server.log"
else
    echo "Python3 not found. Trying python..."
    if command -v python &>/dev/null; then
        nohup python -m http.server $PORT > server.log 2>&1 &
        PID=$!
        echo "Server running with PID: $PID"
        echo "Log file: $DIR/server.log"
    else
        echo "Error: Python is not installed."
        exit 1
    fi
fi
