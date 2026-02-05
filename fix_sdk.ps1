# PowerShell Script to Fix Android SDK Location and Build
# Save as fix_sdk.ps1

Write-Host "[INFO] Finding Android SDK..." -ForegroundColor Cyan

# 1. Define Potential Paths
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ProgramFiles\Android\Android Studio\plugins\android\lib\sdk",
    "C:\Android\android-sdk",
    "C:\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
)

$sdkPath = $null

# 2. Check Paths
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $sdkPath = $path
        Write-Host "[OK] Found SDK at: $sdkPath" -ForegroundColor Green
        break
    }
}

# 3. Manual Fallback
if (-not $sdkPath) {
    Write-Host "[WARN] Could not auto-detect SDK." -ForegroundColor Yellow
    # Fallback to ANDROID_HOME if set
    if ($env:ANDROID_HOME) {
        $sdkPath = $env:ANDROID_HOME
        Write-Host "[INFO] Using ANDROID_HOME: $sdkPath"
    }
    else {
        Write-Error "[ERROR] SDK not found. Please install Android Studio."
        exit 1
    }
}

# 4. Escape Path for local.properties
# Replace single backslash with double backslash for properties file format
$escapedSdkPath = $sdkPath -replace "\\", "\\"

# 5. Write local.properties
$targetFile = "mobile_app\android\local.properties"
$content = "sdk.dir=$escapedSdkPath"

Set-Content -Path $targetFile -Value $content
Write-Host "[OK] Created $targetFile" -ForegroundColor Green

# 6. Set JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
Write-Host "[OK] Set JAVA_HOME to $env:JAVA_HOME" -ForegroundColor Green

# 7. Run Build
Write-Host "[INFO] Starting Build..." -ForegroundColor Cyan
Set-Location mobile_app\android
./gradlew.bat assembleRelease
