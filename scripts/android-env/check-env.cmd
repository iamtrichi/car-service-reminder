@echo off
setlocal EnableExtensions
rem ============================================================
rem check-env.cmd - Android emulator environment audit
rem Prints [PASS]/[FAIL] per component. Exit 0 = ready, 1 = gaps.
rem Usage: run from anywhere. SDK root: %ANDROID_SDK_HOME% (default G:\Android)
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"
set "FAILS=0"

rem Locate repo root (this script lives in <repo>\scripts\android-env)
set "REPO=%~dp0..\.."
pushd "%REPO%" >nul 2>&1
set "REPO=%CD%"
popd >nul 2>&1

echo Android Emulator Environment Check
echo SDK root : %SDK%
echo Repo     : %REPO%
echo.

call :check_dir "%SDK%" "SDK root"
call :check_file "%SDK%\jdk-17\bin\java.exe" "JDK 17 - sdkmanager/avdmanager"
call :check_file "%SDK%\jdk-21\bin\java.exe" "JDK 21 - Gradle"
call :check_file "%SDK%\cmdline-tools\latest\bin\sdkmanager.bat" "cmdline-tools - sdkmanager"
call :check_file "%SDK%\platform-tools\adb.exe" "platform-tools - adb"
call :check_dir "%SDK%\platforms\android-35" "Android platform android-35"
call :check_glob "%SDK%\build-tools" "Build-tools"
call :check_file "%SDK%\emulator\emulator.exe" "Emulator binary"
call :check_dir "%SDK%\system-images\android-35\google_apis\x86_64" "System image android-35 google_apis x86_64"
call :check_dir "%SDK%\extras\google\Android_Emulator_Hypervisor_Driver" "AEHD package"
call :check_glob "%SDK%\licenses" "SDK licenses accepted"
call :check_file "%USERPROFILE%\.android\avd\csr_avd.ini" "AVD csr_avd"
call :check_contains "%REPO%\android\local.properties" "sdk.dir" "android/local.properties points to SDK"
call :check_dir "%REPO%\node_modules" "npm dependencies - node_modules"

echo.
if %FAILS% GTR 0 (
    echo RESULT: %FAILS% check^(s^) FAILED. Run the matching script in scripts\android-env\ to fix.
    exit /b 1
)
echo RESULT: ALL CHECKS PASSED - environment ready.
exit /b 0

:check_dir
if exist "%~1\" (
    echo [PASS] %~2
) else (
    echo [FAIL] %~2 - missing: %~1
    set /a FAILS+=1
)
goto :eof

:check_file
if exist "%~1" (
    echo [PASS] %~2
) else (
    echo [FAIL] %~2 - missing: %~1
    set /a FAILS+=1
)
goto :eof

:check_glob
dir /b /a "%~1" 2>nul | findstr /r "." >nul
if not errorlevel 1 (
    echo [PASS] %~2
) else (
    echo [FAIL] %~2 - empty or missing: %~1
    set /a FAILS+=1
)
goto :eof

:check_contains
findstr /c:"%~2" "%~1" >nul 2>&1
if not errorlevel 1 (
    echo [PASS] %~3
) else (
    echo [FAIL] %~3 - no "%~2" found in %~1
    set /a FAILS+=1
)
goto :eof