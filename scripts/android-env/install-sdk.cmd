@echo off
setlocal EnableExtensions
rem ============================================================
rem install-sdk.cmd - Bootstrap cmdline-tools, accept licenses,
rem install all required Android SDK packages.
rem Idempotent: skips parts that already exist.
rem Requires JDK 17 in the SDK root first: install-jdk.cmd 17
rem ============================================================

if "%ANDROID_SDK_HOME%"=="" set "ANDROID_SDK_HOME=G:\Android"
set "SDK=%ANDROID_SDK_HOME%"

set "JAVA_HOME=%SDK%\jdk-17"
set "PATH=%SDK%\jdk-17\bin;%PATH%"
set "SDKM=%SDK%\cmdline-tools\latest\bin\sdkmanager.bat"

if not exist "%SDK%\jdk-17\bin\java.exe" (
    echo [ERROR] JDK 17 required but not found at %SDK%\jdk-17
    echo         Run first: scripts\android-env\install-jdk.cmd 17
    exit /b 1
)

if not exist "%SDK%" mkdir "%SDK%"

rem ---- 1. Bootstrap cmdline-tools if missing -----------------
if not exist "%SDKM%" (
    echo Bootstrapping Android cmdline-tools...
    curl -L -o "%SDK%\cmdline-tools.zip" "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" --connect-timeout 30 --max-time 1800 -s
    if errorlevel 1 (
        echo [ERROR] cmdline-tools download failed. Check network/proxy and retry.
        exit /b 1
    )
    powershell -NoProfile -Command "Expand-Archive -Path '%SDK%\cmdline-tools.zip' -DestinationPath '%SDK%\_clt' -Force"
    if errorlevel 1 (
        echo [ERROR] cmdline-tools extraction failed.
        del "%SDK%\cmdline-tools.zip" >nul 2>&1
        exit /b 1
    )
    if not exist "%SDK%\cmdline-tools" mkdir "%SDK%\cmdline-tools"
    move "%SDK%\_clt\cmdline-tools" "%SDK%\cmdline-tools\latest" >nul
    rmdir /s /q "%SDK%\_clt" >nul 2>&1
    del "%SDK%\cmdline-tools.zip" >nul 2>&1
) else (
    echo [SKIP] cmdline-tools already present.
)

rem ---- 2. Accept licenses -------------------------------------
echo Accepting SDK licenses...
set "YESFILE=%TEMP%\csr_yes.txt"
break > "%YESFILE%"
for /l %%I in (1,1,10) do echo y>> "%YESFILE%"
type "%YESFILE%" | call "%SDKM%" --sdk_root="%SDK%" --licenses >nul 2>&1
del "%YESFILE%" >nul 2>&1

if not exist "%SDK%\licenses\android-sdk-license" (
    echo Falling back to writing known license hashes...
    if not exist "%SDK%\licenses" mkdir "%SDK%\licenses"
    > "%SDK%\licenses\android-sdk-license" (
        echo 24333f8a63b6825ea9c5514f83c2829b004d1fee
        echo 8933bad161af4178b1185d1a37fbf41ea5269c55
        echo d56f5187479451eabf01fb78af6dfcb131a6481e
    )
)

rem ---- 3. Install packages ------------------------------------
echo Installing SDK packages ^(this can take several minutes^)...
call "%SDKM%" --sdk_root="%SDK%" "platform-tools" "platforms;android-35" "build-tools;35.0.0" "emulator" "system-images;android-35;google_apis;x86_64"
if errorlevel 1 (
    echo [ERROR] sdkmanager failed. Re-run this script to resume.
    exit /b 1
)

echo [DONE] SDK packages installed under %SDK%
exit /b 0