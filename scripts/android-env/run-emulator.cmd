@echo off
setlocal EnableExtensions
rem ============================================================
rem run-emulator.cmd - Boot the csr_avd emulator and wait for it
rem to finish booting. Keeps running until you close the window.
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"
set "EMU=%SDK%\emulator\emulator.exe"
set "ADB=%SDK%\platform-tools\adb.exe"

set "PATH=%SDK%\platform-tools;%PATH%"

if not exist "%EMU%" (
    echo [ERROR] Emulator not found at %EMU%
    echo         Run first: scripts\android-env\install-sdk.cmd
    exit /b 1
)

if not exist "%USERPROFILE%\.android\avd\csr_avd.ini" (
    echo [ERROR] AVD csr_avd not found.
    echo         Run first: scripts\android-env\create-avd.cmd
    exit /b 1
)

echo Checking hardware acceleration...
call "%EMU%" -accel-check

echo Starting emulator csr_avd...
start "CSR Emulator" "%EMU%" -avd csr_avd

echo Waiting for device...
"%ADB%" wait-for-device

:waitboot
set "BOOT="
for /f "tokens=2 delims= " %%A in ('"%ADB%" shell getprop sys.boot_completed 2^>nul') do set "BOOT=%%A"
if "%BOOT%"=="1" goto booted
timeout /t 3 /nobreak >nul
goto waitboot

:booted
echo [DONE] Emulator csr_avd is fully booted.
echo        Install and launch the app with: scripts\android-env\build-and-run.cmd
exit /b 0