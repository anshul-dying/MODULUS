@echo off
echo Starting AutoTrain Advanced Backend...
echo.
echo Activating virtual environment...
call venv\Scripts\activate
echo.
echo Starting FastAPI server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
python main.py
pause
