$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

cd mobile_app\android
./gradlew.bat assembleRelease --stacktrace > build_error.log 2>&1
Type build_error.log
