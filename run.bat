@echo off
echo ================================================
echo  AI Job Application Assistant - Starting Server
echo ================================================
echo.

SET PYTHON_PATH="C:\Users\ADMIN\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist %PYTHON_PATH% (
    SET PYTHON=%PYTHON_PATH%
) else (
    SET PYTHON=python
)

echo [1/3] Checking frontend build...
if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies & building React app...
    pushd frontend
    call npm install
    call npm run build
    popd
) else (
    if not exist "static\assets\" (
        echo Compiling React frontend...
        pushd frontend
        call npm run build
        popd
    )
)
echo.

echo [2/3] Checking python dependencies...
%PYTHON% -c "import fastapi, uvicorn, reportlab, pypdf, docx, openai, dotenv" 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo Installing missing dependencies...
    %PYTHON% -m pip install fastapi uvicorn reportlab pypdf python-docx openai python-multipart python-dotenv
)
echo.

echo [3/3] Starting FastAPI server on http://127.0.0.1:8000
echo.
echo Open your browser at: http://127.0.0.1:8000
echo Press Ctrl+C to stop the server.
echo.

%PYTHON% -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
