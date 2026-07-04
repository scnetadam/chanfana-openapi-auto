@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
  echo Usage: upload-and-build.bat ^<ECS_IP^> [ECS_USER=root] [CLT_ZIP_PATH]
  echo.
  echo Example:
  echo   upload-and-build.bat 120.46.133.72
  echo   upload-and-build.bat 120.46.133.72 root C:\Downloads\commandline-tools-linux-x64.zip
  exit /b 1
)

set ECS_IP=%~1
set ECS_USER=%~2
if "%ECS_USER%"=="" set ECS_USER=root
set CLT_ZIP=%~3
set PROJECT_DIR=%~dp0
set PROJECT_NAME=x402-deveco

echo ============================================
echo  X402-DEVECO Upload ^& Docker Build
echo  Target: %ECS_USER%@%ECS_IP%
echo ============================================

echo.
echo [1/5] Packaging project (excluding node_modules)...
cd /d "%PROJECT_DIR%.."
tar czf "%TEMP%\%PROJECT_NAME%.tar.gz" --exclude=node_modules --exclude=build --exclude=.hvigor --exclude=oh_modules --exclude=commandline-tools --exclude=.env %PROJECT_NAME%
echo   Package created

echo.
echo [2/5] Uploading to ECS...
scp "%TEMP%\%PROJECT_NAME%.tar.gz" %ECS_USER%@%ECS_IP%:/tmp/
del "%TEMP%\%PROJECT_NAME%.tar.gz"

if not "%CLT_ZIP%"=="" (
  echo   Uploading Command Line Tools...
  scp "%CLT_ZIP%" %ECS_USER%@%ECS_IP%:/tmp/cmdline-tools.zip
  set HAS_CLT=1
) else (
  set HAS_CLT=0
)

echo.
echo [3/5] Preparing on ECS...
ssh %ECS_USER%@%ECS_IP% "cd /home/%ECS_USER% && rm -rf %PROJECT_NAME% && tar xzf /tmp/%PROJECT_NAME%.tar.gz && rm /tmp/%PROJECT_NAME%.tar.gz"

echo.
echo [4/5] Building Docker image...
if !HAS_CLT!==1 (
  ssh %ECS_USER%@%ECS_IP% "cd /home/%ECS_USER%/%PROJECT_NAME% && docker build --build-arg CLT_ZIP=/tmp/cmdline-tools.zip -f Dockerfile.harmony -t x402-harmony-builder ."
) else (
  ssh %ECS_USER%@%ECS_IP% "cd /home/%ECS_USER%/%PROJECT_NAME% && docker build -f Dockerfile.harmony -t x402-harmony-builder ."
)

echo.
echo [5/5] Running build in container...
if !HAS_CLT!==1 (
  ssh %ECS_USER%@%ECS_IP% "cd /home/%ECS_USER%/%PROJECT_NAME% && mkdir -p entry/build && docker run --rm -v $(pwd)/entry/build:/home/build/project/entry/build x402-harmony-builder bash -c 'cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh'"
) else (
  ssh %ECS_USER%@%ECS_IP% "cd /home/%ECS_USER%/%PROJECT_NAME% && mkdir -p entry/build && docker run --rm -v $(pwd)/entry/build:/home/build/project/entry/build -v /home/%ECS_USER%/commandline-tools:/home/tools/commandline-tools x402-harmony-builder bash -c 'cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh'"
)

echo.
echo ============================================
echo  Done! Download HAP:
echo  scp %ECS_USER%@%ECS_IP%:/home/%ECS_USER%/%PROJECT_NAME%/entry/build/default/outputs/default/entry-default-unsigned.hap ./
echo ============================================
endlocal
