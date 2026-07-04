@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  X402-DEVECO Docker Build Helper (Windows)
echo ============================================
echo.

set PROJECT_DIR=%~dp0
set SERVER_IP=
set SERVER_USER=root

set /p SERVER_IP="Enter Huawei Cloud ECS IP address: "
if "%SERVER_IP%"=="" (
    echo ERROR: Server IP is required
    exit /b 1
)

echo.
echo [1/4] Checking SSH connection...
ssh -o ConnectTimeout=5 %SERVER_USER%@%SERVER_IP% "echo OK" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to %SERVER_USER%@%SERVER_IP%
    echo Please check:
    echo   1. Server IP is correct
    echo   2. SSH service is running
    echo   3. You have SSH key or password configured
    exit /b 1
)
echo SSH connection: OK

echo.
echo [2/4] Uploading project to server...
echo This may take a few minutes...
scp -r "%PROJECT_DIR%." %SERVER_USER%@%SERVER_IP%:~/x402-deveco/
if errorlevel 1 (
    echo ERROR: Upload failed
    exit /b 1
)
echo Upload: OK

echo.
echo [3/4] Running build on server...
echo.
ssh -t %SERVER_USER%@%SERVER_IP% "cd ~/x402-deveco && chmod +x docker-build-harmony.sh euler-init.sh build-cloud.sh && ./docker-build-harmony.sh"

echo.
echo [4/4] Build process completed
echo.
echo Next steps:
echo   1. Download HAP: scp %SERVER_USER%@%SERVER_IP%:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
echo   2. Or check server: ssh %SERVER_USER%@%SERVER_IP%
echo.
pause
