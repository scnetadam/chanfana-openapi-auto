@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  X402-DEVECO HarmonyOS Cloud Build Script
echo ============================================

set PROJECT_DIR=%~dp0

echo [1/7] Checking environment...
node --version
java -version

echo [2/8] Installing all dependencies (npm + @ohos via .npmrc)...
cd /d "%PROJECT_DIR%"
call npm install

echo [3/7] Installing ohpm dependencies...
where ohpm >nul 2>&1
if !errorlevel! equ 0 (
  call ohpm install --all --registry https://ohpm.openharmony.cn/ohpm/
) else (
  echo WARN: ohpm not found, skipping
)

echo [4/7] Syncing project resources...
if exist "hvigorw.bat" (
  call hvigorw.bat --mode project -p product=default --no-daemon SyncProjectResourceToHvigor
  call hvigorw.bat --mode module -p module=entry@default --no-daemon SyncModuleResourceToHvigor
) else if exist "hvigor\hvigor-wrapper.js" (
  node hvigor\hvigor-wrapper.js --mode project -p product=default --no-daemon SyncProjectResourceToHvigor
  node hvigor\hvigor-wrapper.js --mode module -p module=entry@default --no-daemon SyncModuleResourceToHvigor
) else (
  echo WARN: No hvigor wrapper found
)

echo [5/7] Building HAP (assembleHap)...
if exist "hvigorw.bat" (
  call hvigorw.bat --mode module -p module=entry@default -p product=default --no-daemon assembleHap --parallel=3 --incremental
) else if exist "hvigor\hvigor-wrapper.js" (
  node hvigor\hvigor-wrapper.js --mode module -p module=entry@default -p product=default --no-daemon assembleHap --parallel=3 --incremental
) else (
  echo ERROR: No build tool found
  exit /b 1
)

echo [6/7] Checking build output...
set HAP_PATH=%PROJECT_DIR%entry\build\default\outputs\default\entry-default-unsigned.hap
if exist "%HAP_PATH%" (
  echo ============================================
  echo  BUILD SUCCESSFUL!
  echo  HAP: %HAP_PATH%
  for %%A in ("%HAP_PATH%") do echo  Size: %%~zA bytes
  echo ============================================
) else (
  echo WARN: HAP not found at expected path
  dir /s /b "%PROJECT_DIR%entry\build\*.hap" 2>nul || echo No HAP files found
)

echo.
echo [7/7] Backend server: npm start
echo ============================================
endlocal
