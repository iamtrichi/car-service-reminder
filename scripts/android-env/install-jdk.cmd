@echo off
setlocal EnableExtensions
rem ============================================================
rem install-jdk.cmd - Install Temurin JDK 17 or 21 into the SDK root
rem Usage: install-jdk.cmd [17|21]   (default: 21)
rem Idempotent: skips if the target JDK already exists.
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"

set "VER=%~1"
if "%VER%"=="" set "VER=21"
if not "%VER%"=="17" if not "%VER%"=="21" (
    echo Usage: install-jdk.cmd [17^|21]
    exit /b 2
)

set "DEST=%SDK%\jdk-%VER%"
if exist "%DEST%\bin\java.exe" (
    echo [SKIP] JDK %VER% already installed at %DEST%
    exit /b 0
)

if not exist "%SDK%" mkdir "%SDK%"

echo Downloading Temurin JDK %VER% (Windows x64)...
curl -L -o "%SDK%\jdk%VER%.zip" "https://api.adoptium.net/v3/binary/latest/%VER%/ga/windows/x64/jdk/hotspot/normal/eclipse" --connect-timeout 30 --max-time 1800 -s
if errorlevel 1 (
    echo [ERROR] JDK %VER% download failed. Check network/proxy and retry.
    exit /b 1
)

echo Extracting...
powershell -NoProfile -Command "Expand-Archive -Path '%SDK%\jdk%VER%.zip' -DestinationPath '%SDK%\_jdk%VER%_extract' -Force"
if errorlevel 1 (
    echo [ERROR] Extraction failed.
    del "%SDK%\jdk%VER%.zip" >nul 2>&1
    exit /b 1
)

set "JDKDIR="
for /d %%D in ("%SDK%\_jdk%VER%_extract\jdk-*") do set "JDKDIR=%%D"
if "%JDKDIR%"=="" (
    echo [ERROR] Could not locate extracted jdk-* folder.
    rmdir /s /q "%SDK%\_jdk%VER%_extract" >nul 2>&1
    del "%SDK%\jdk%VER%.zip" >nul 2>&1
    exit /b 1
)

move "%JDKDIR%" "%DEST%" >nul
rmdir /s /q "%SDK%\_jdk%VER%_extract" >nul 2>&1
del "%SDK%\jdk%VER%.zip" >nul 2>&1

echo Verifying...
"%DEST%\bin\java.exe" -version
if errorlevel 1 (
    echo [ERROR] Installed JDK %VER% failed to run.
    exit /b 1
)
echo [DONE] JDK %VER% installed at %DEST%
exit /b 0