$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host "Set JAVA_HOME to $env:JAVA_HOME"
java -version

cd mobile_app\android

# Clean first to remove any old artifacts
./gradlew.bat clean

# Build Release APK
./gradlew.bat assembleRelease
