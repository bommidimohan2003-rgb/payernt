@echo off
echo ===================================================
echo             Starting Payent Backend API
echo ===================================================
cd /d "%~dp0"

if exist "..\.venv\Scripts\python.exe" (
    echo [INFO] Activating virtual environment ..\.venv
    ..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
) else (
    echo [WARNING] Local virtual environment not found. Using global python...
    python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
)
pause
