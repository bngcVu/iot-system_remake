# Runs the Spring Boot app with UTF-8 console output on Windows PowerShell
# - Sets console code page and OutputEncoding to UTF-8 to prevent mojibake
# - Builds the JAR and runs it (avoids DevTools restart and LiveReload spam)

param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "[run-utf8] Forcing console to UTF-8..." -ForegroundColor Cyan
try {
    chcp 65001 | Out-Null
} catch {}

try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
} catch {}

# Ensure we're in the module root (folder that has mvnw.cmd and target/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

if (-not $SkipBuild) {
    Write-Host "[run-utf8] Building project (skip tests)..." -ForegroundColor Cyan
    if (-not (Test-Path .\mvnw.cmd)) {
        throw "mvnw.cmd not found. Please run this script from the iot-system module directory."
    }
    & .\mvnw.cmd -q -DskipTests package
}

# Find the latest built JAR (exclude *.original)
$jar = Get-ChildItem -Path .\target -Filter "iot-system-*.jar" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike "*.original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $jar) {
    throw "Could not find built JAR in .\target. Try running without -SkipBuild."
}

# Force JVM to use UTF-8 for file and JNI encoding
$env:JAVA_TOOL_OPTIONS = "-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8"
Write-Host "[run-utf8] Starting: $($jar.Name) with UTF-8 encoding" -ForegroundColor Green

# Run the app
& java -jar $jar.FullName
