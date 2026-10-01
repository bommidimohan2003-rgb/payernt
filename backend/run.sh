#!/bin/bash
echo "==================================================="
echo "            Starting Payent Backend API"
echo "==================================================="
cd "$(dirname "$0")"

if [ -f "../.venv/bin/python" ]; then
    echo "[INFO] Activating virtual environment ../.venv"
    ../.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
elif [ -f "../.venv/Scripts/python" ]; then
    echo "[INFO] Activating virtual environment ../.venv"
    ../.venv/Scripts/python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
else
    echo "[WARNING] Local virtual environment not found. Using system python..."
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
fi
