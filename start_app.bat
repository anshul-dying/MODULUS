@echo off
echo Starting AutoTrain Advanced Application...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0 && venv\Scripts\activate && python -m uvicorn src.autotrain.api.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window...
pause > nul
