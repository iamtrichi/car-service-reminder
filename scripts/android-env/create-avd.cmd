@echo off
setlocal EnableExtensions
rem ============================================================
rem create-avd.cmd - Create the csr_avd emulator (Pixel 7, API 35)
rem Idempotent: skips if the AVD already exists.
rem Requires the system image first: install-sdk.cmd
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"

set "JAVA_HOME=%SDK%\jdk-17"
set "PATH=%SDK%\jdk-17\bin;%PATH%"
set "AVDM=%SDK%\cmdline-tools\latest\bin\avdmanager.bat"

if not exist "%AVDM%" (
    echo [ERROR] avdmanager not found at %AVDM%
    echo         Run first: scripts\android-env\install-sdk.cmd
    exit /b 1
)

if exist "%USERPROFILE%\.android\avd\csr_avd.ini" (
    echo [SKIP] AVD csr_avd already exists.
    exit /b 0
)

echo Creating AVD csr_avd (Pixel 7, android-35 google_apis x86_64)...
echo no | call "%AVDM%" create avd -n csr_avd -k "system-images;android-35;google_apis;x86_64" -d pixel_7
if errorlevel 1 (
    echo [ERROR] avdmanager failed. Is the system image installed? Re-run install-sdk.cmd
    exit /b 1
)

if not exist "%USERPROFILE%\.android\avd\csr_avd.ini" (
    echo [ERROR] AVD was not created - check output above.
    exit /b 1
)

echo [DONE] AVD csr_avd created.
exit /b 0