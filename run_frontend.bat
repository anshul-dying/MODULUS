@echo off
echo Starting AutoTrain Advanced Frontend...
echo.
echo Installing dependencies (if needed)...
cd frontend
call npm install
echo.
echo Starting React development server on http://localhost:5173
echo.
call npm run dev
pause