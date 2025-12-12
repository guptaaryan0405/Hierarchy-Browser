#!/bin/bash
cd "$(dirname "$0")"
echo "Starting local server for Hierarchy Visualizer..."
# Open default browser
open http://localhost:8000
# Start simple python serve
python3 -m http.server 8000
