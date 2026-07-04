@echo off
setlocal

echo ============================================
echo  X402-DEVECO - 打包上传文件
echo  无公网IP ECS: 通过华为云控制台上传
echo ============================================

set PROJECT_DIR=%~dp0
set OUTPUT=%TEMP%\x402-deveco-upload

echo.
echo [1/2] Packaging project...
if exist "%OUTPUT%" rmdir /s /q "%OUTPUT%"
mkdir "%OUTPUT%"

tar czf "%OUTPUT%\x402-deveco.tar.gz" ^
  --exclude=node_modules ^
  --exclude=build ^
  --exclude=.hvigor ^
  --exclude=oh_modules ^
  --exclude=commandline-tools ^
  -C "%PROJECT_DIR%.." ^
  x402-deveco

for %%A in ("%OUTPUT%\x402-deveco.tar.gz") do (
  echo   Package: %%~zA bytes (%%~zA / 1048576 = ~MB)
)

echo.
echo [2/2] Upload instructions:
echo.
echo   Method 1: CloudShell (Recommended)
echo   ----------------------------------------
echo   1. Open Huawei Cloud Console: https://console.huawei.com/ecm
echo   2. Find your ECS, click "Remote Login" -^> "CloudShell Login"
echo   3. In CloudShell, click the upload icon (^) in toolbar
echo      Upload file: %OUTPUT%\x402-deveco.tar.gz
echo      (uploads to /home/user/ directory)
echo   4. Then run in CloudShell:
echo.
echo      cd /home/user
echo      tar xzf x402-deveco.tar.gz
echo      cd x402-deveco
echo      chmod +x build-cloud.sh docker-build.sh
echo      docker build -f Dockerfile.harmony -t x402-harmony-builder .
echo      mkdir -p entry/build
echo      docker run --rm -v $(pwd)/entry/build:/home/build/project/entry/build x402-harmony-builder bash -c "cd /home/build/project && ./build-cloud.sh"
echo.
echo   Method 2: Object Storage OBS
echo   ----------------------------------------
echo   1. Open OBS console: https://console.huawei.com obs
echo   2. Create bucket, upload x402-deveco.tar.gz
echo   3. In ECS CloudShell:
echo      curl -o /tmp/x402-deveco.tar.gz "OBS_TEMP_URL"
echo      Then same steps as above
echo.
echo   Method 3: EIP (if available)
echo   ----------------------------------------
echo   1. Bind EIP to ECS in console
echo   2. Use scp upload-and-build.bat EIP root
echo.
echo ============================================

echo.
echo Opening output folder...
explorer "%OUTPUT%"

endlocal
