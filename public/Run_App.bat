@echo off
echo Starting local server for Hierarchy Visualizer...
start http://localhost:8000
python -m http.server 8000
pause
