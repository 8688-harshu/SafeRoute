$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdkPath)) {
    Write-Error "Android SDK not found at $sdkPath"
    exit 1
}

# Escape backslashes for properties file
$escapedSdkPath = $sdkPath -replace "\\", "\\"

# The content for local.properties
# Note: Windows paths in local.properties often need escaping like C\:\\Users
$fileContent = "sdk.dir=$escapedSdkPath"

$targetFile = "mobile_app\android\local.properties"
Set-Content -Path $targetFile -Value $fileContent
Write-Host "Created $targetFile with content: $fileContent"

# Set Java Home (Critical for build)
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Run Build
Set-Location mobile_app\android
./gradlew.bat assembleRelease
