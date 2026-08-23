@echo off
setlocal EnableExtensions
rem ============================================================
rem build-aab.cmd - Build the SIGNED release AAB for Play Store:
rem   npm deps -> web build -> cap sync -> gradlew bundleRelease
rem Output: android\app\build\outputs\bundle\release\app-release.aab
rem Signing: android/release.keystore via android/key.properties
rem          (wired in android/app/build.gradle signingConfigs.release)
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"

rem Locate repo root (this script lives in <repo>\scripts\android-env)
pushd "%~dp0..\.." >nul
set "REPO=%CD%"
popd >nul

rem Gradle MUST use JDK 21 (AGP rejects Java 8/11; sdkmanager needs 17, not used here)
set "JAVA_HOME=%SDK%\jdk-21"
set "ANDROID_HOME=%SDK%"
set "ANDROID_SDK_ROOT=%SDK%"

if not exist "%SDK%\jdk-21\bin\java.exe" (
    echo [ERROR] JDK 21 not found at %SDK%\jdk-21
    echo         Run first: scripts\android-env\install-jdk.cmd 21
    exit /b 1
)

if not exist "%REPO%\android\release.keystore" (
    echo [ERROR] Keystore missing: %REPO%\android\release.keystore
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

rem ---- 5. Signed release AAB ----------------------------------
echo Building signed release AAB ^(first build can take several minutes^)...
cd /d "%REPO%\android"
call gradlew.bat bundleRelease --no-daemon
if errorlevel 1 (
    echo [ERROR] Gradle bundleRelease failed. See output above.
    cd /d "%REPO%"
    exit /b 1
)
cd /d "%REPO%"

set "AAB=%REPO%\android\app\build\outputs\bundle\release\app-release.aab"
if not exist "%AAB%" (
    echo [ERROR] AAB not found at %AAB%
    exit /b 1
)

for %%F in ("%AAB%") do set "SIZE_BYTES=%%~zF"
set /a SIZE_MB=%SIZE_BYTES% / 1048576

echo.
echo ============================================================
echo [DONE] Signed release AAB ready:
echo   %AAB%
echo   Size: %SIZE_MB% MB
echo.
echo Next steps:
echo   - Upload to Google Play Console (Production / Internal testing)
echo   - Bump versionCode / versionName in android\app\build.gradle
echo     BEFORE each new upload (currently hardcoded there)
echo ============================================================
exit /b 0