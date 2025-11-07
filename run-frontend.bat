@echo off
REM run-frontend.bat - Start simple HTTP server for frontend static files
REM Requires Python 3 (uses http.server module)
REM Usage: run-frontend.bat [port]

:: set UTF-8 code page
chcp 65001 >nul
setlocal

:: remember script dir and go there
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

:: check if Front-end folder exists
if not exist "Front-end" (
  echo ERROR: Front-end folder not found!
  pause
  exit /b 1
)

:: navigate to Front-end folder
pushd "Front-end"

:: use provided port or default to 8080
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"

echo.
echo ====================================
echo   Starting Frontend Server
echo ====================================
echo Server will run at: http://localhost:%PORT%
echo Press Ctrl+C to stop the server
echo.
echo Open your browser and navigate to:
echo   http://localhost:%PORT%/index.html
echo.

:: start Python HTTP server
python -m http.server %PORT%

:: restore original folder
popd
popd
