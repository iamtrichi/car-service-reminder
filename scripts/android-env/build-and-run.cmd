@echo off
setlocal EnableExtensions
rem ============================================================
rem build-and-run.cmd - Full pipeline:
rem   npm deps -> web build -> cap sync -> debug APK ->
rem   adb install -> launch app on emulator/device
rem Requires: node, JDK 21 + SDK packages installed,
rem           an emulator running (run-emulator.cmd) or a device.
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"
set "ADB=%SDK%\platform-tools\adb.exe"

rem Locate repo root (this script lives in <repo>\scripts\android-env)
pushd "%~dp0..\.." >nul
set "REPO=%CD%"
popd >nul

rem Gradle needs JDK 21; SDK tools need nothing here
set "JAVA_HOME=%SDK%\jdk-21"
set "ANDROID_HOME=%SDK%"
set "ANDROID_SDK_ROOT=%SDK%"
set "PATH=%SDK%\platform-tools;%PATH%"

if not exist "%SDK%\jdk-21\bin\java.exe" (
    echo [ERROR] JDK 21 not found at %SDK%\jdk-21
    echo         Run first: scripts\android-env\install-jdk.cmd 21
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH. Install Node v24 ^(see .nvmrc^).
    exit /b 1
)

cd /d "%REPO%"

rem ---- 1. npm dependencies ------------------------------------
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm ci
    if errorlevel 1 call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        exit /b 1
    )
) else (
    echo [SKIP] node_modules already present.
)

rem ---- 2. Web build -------------------------------------------
echo Building web assets...
call npm run build
if errorlevel 1 (
    echo [ERROR] Web build failed.
    exit /b 1
)

rem ---- 3. Capacitor sync --------------------------------------
echo Syncing Capacitor Android project...
call npx cap sync android
if errorlevel 1 (
    echo [ERROR] cap sync failed.
    exit /b 1
)

rem ---- 4. Ensure android/local.properties ---------------------
if not exist "android\local.properties" (
    echo Writing android/local.properties...
    powershell -NoProfile -Command "Set-Content -Path 'android\local.properties' -Value ('sdk.dir=' + '%SDK%' -replace '\\','\\' -replace ':','\:')"
)

rem ---- 5. Debug APK -------------------------------------------
echo Building debug APK ^(first build can take several minutes^)...
cd /d "%REPO%\android"
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 (
    echo [ERROR] Gradle build failed. See output above.
    cd /d "%REPO%"
    exit /b 1
)
cd /d "%REPO%"

set "APK=%REPO%\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
    echo [ERROR] APK not found at %APK%
    exit /b 1
)

rem ---- 6. Install & launch ------------------------------------
"%ADB%" get-state >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No device/emulator detected. Start one first:
    echo         scripts\android-env\run-emulator.cmd
    exit /b 1
)

echo Installing APK...
"%ADB%" install -r "%APK%"
if errorlevel 1 (
    echo [ERROR] adb install failed.
    exit /b 1
)

echo Launching app...
"%ADB%" shell am start -n com.carservice.reminder/.MainActivity
if errorlevel 1 (
    echo [ERROR] Failed to launch activity.
    exit /b 1
)

echo [DONE] Car Service Reminder is running on the emulator/device.
exit /b 0