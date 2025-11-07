@echo off
REM run-backend.bat - Start Spring Boot backend server
REM Usage: run-backend.bat [clean] [extra maven args]

:: set UTF-8 code page
chcp 65001 >nul
setlocal

:: remember script dir and go there
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

:: navigate to Back-end/iot-system folder
if exist "Back-end\iot-system\mvnw.cmd" (
  pushd "Back-end\iot-system"
) else (
  echo ERROR: Back-end/iot-system folder not found!
  pause
  exit /b 1
)

:: choose mvnw.cmd if present, otherwise fallback to system mvn
if exist "mvnw.cmd" (
  set "MVNCMD=mvnw.cmd"
) else (
  set "MVNCMD=mvn"
)

:: build arguments: allow optional 'clean' as first arg, and pass-through any extra args via %*
if "%1"=="clean" (
  set "ARGS=clean spring-boot:run %*"
) else (
  set "ARGS=spring-boot:run %*"
)

echo.
echo ====================================
echo   Starting Backend Server
echo ====================================
echo Running: %MVNCMD% %ARGS%
echo.
call "%MVNCMD%" %ARGS%
set "RC=%ERRORLEVEL%"

:: restore original folder and exit with Maven exit code
popd
popd
exit /b %RC%
