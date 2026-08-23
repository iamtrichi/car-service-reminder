@echo off
setlocal EnableExtensions
rem ============================================================
rem install-aehd.cmd - Install Android Emulator Hypervisor Driver
rem 1) Downloads the AEHD package via sdkmanager
rem 2) Runs the silent driver installer (needs ADMIN elevation)
rem Idempotent: skips if the package is already present.
rem Note: if Hyper-V/WHPX is enabled, the emulator uses WHPX and
rem       AEHD is not required - that is fine.
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"

set "JAVA_HOME=%SDK%\jdk-17"
set "PATH=%SDK%\jdk-17\bin;%PATH%"
set "SDKM=%SDK%\cmdline-tools\latest\bin\sdkmanager.bat"

if not exist "%SDKM%" (
    echo [ERROR] cmdline-tools not found at %SDKM%
    echo         Run first: scripts\android-env\install-sdk.cmd
    exit /b 1
)

set "AEHD_DIR=%SDK%\extras\google\Android_Emulator_Hypervisor_Driver"

if not exist "%AEHD_DIR%\silent_install.bat" (
    echo Installing AEHD package via sdkmanager...
    call "%SDKM%" --sdk_root="%SDK%" "extras;google;Android_Emulator_Hypervisor_Driver"
    if errorlevel 1 (
        echo [ERROR] sdkmanager failed to install AEHD package.
        exit /b 1
    )
) else (
    echo [SKIP] AEHD package already present at %AEHD_DIR%
)

if not exist "%AEHD_DIR%\silent_install.bat" (
    echo [WARN] silent_install.bat still missing after install - aborting.
    exit /b 1
)

echo Running AEHD silent installer ^(requires Administrator^)...
pushd "%AEHD_DIR%"
call silent_install.bat
set "AERR=%ERRORLEVEL%"
popd

sc query aehd 2>nul | findstr /i "RUNNING" >nul
if not errorlevel 1 (
    echo [DONE] AEHD driver installed and RUNNING.
    exit /b 0
)

echo [WARN] AEHD service is not running (installer exit code %AERR%).
echo        Possible causes:
echo          - Shell is not elevated        : re-run from an Administrator terminal
echo          - Hyper-V/Core Isolation active: emulator will use WHPX instead (acceptable)
echo        Manual step: run "%AEHD_DIR%\silent_install.bat" as Administrator.
exit /b 0