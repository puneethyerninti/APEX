param(
    [Parameter(Mandatory = $true)][ValidateRange(1, 2100000000)][int]$VersionCode,
    [Parameter(Mandatory = $true)][ValidatePattern('^[0-9]+\.[0-9]+(\.[0-9]+)?$')][string]$VersionName,
    [Parameter(Mandatory = $true)][string]$KeyStorePath,
    [string]$KeyAlias = 'apex-upload'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$required = @(
    'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SOCKET_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_MAPBOX_API_KEY', 'APEX_STORE_PASSWORD', 'APEX_KEY_PASSWORD'
)
$missing = @($required | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_, 'Process')) })
if ($missing.Count) { throw "Release configuration is missing: $($missing -join ', '). Values must be set privately in this process." }
foreach ($key in @('NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SOCKET_URL')) {
    $uri = [Uri][Environment]::GetEnvironmentVariable($key, 'Process')
    if (!$uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Host -in @('localhost', '127.0.0.1')) {
        throw "$key must target a production HTTPS service, without credentials."
    }
}
if ($env:NEXT_PUBLIC_FIREBASE_PROJECT_ID -ne 'apex-5b654' -or $env:NEXT_PUBLIC_FIREBASE_API_KEY -match 'your-api-key|placeholder|REPLACE') {
    throw 'Use the actual public configuration for the deployed APEX Firebase project.'
}
if (!(Test-Path -LiteralPath $KeyStorePath -PathType Leaf)) { throw 'The upload keystore file was not found.' }
if (!(Test-Path -LiteralPath (Join-Path $root 'node_modules/.bin/cap.cmd'))) { throw 'Install root project dependencies with npm ci before the release build.' }
if (!(Test-Path -LiteralPath (Join-Path $root 'node_modules/.bin/next.cmd'))) { throw 'Root Next.js dependencies are missing.' }
if (!(Get-Command java -ErrorAction SilentlyContinue)) { throw 'Configure a compatible JDK before building Android.' }

$settings = @{
    NEXT_PUBLIC_DISTRIBUTION = 'google-play'
    APEX_VERSION_CODE = [string]$VersionCode
    APEX_VERSION_NAME = $VersionName
    APEX_KEYSTORE_PATH = (Resolve-Path -LiteralPath $KeyStorePath).Path
    APEX_KEY_ALIAS = $KeyAlias
}
$old = @{}
foreach ($key in $settings.Keys) {
    $old[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $settings[$key], 'Process')
}
Push-Location $root
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Production web build failed; Android bundle was not created.' }
    if (!(Test-Path -LiteralPath 'out/index.html')) { throw 'Static production export is missing.' }
    & npx.cmd --no-install cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Native asset synchronization failed.' }
    $marker = @{ distribution = 'google-play'; versionCode = $VersionCode; versionName = $VersionName }
    $markerPath = Join-Path $root 'android/app/src/main/assets/public/apex-release.json'
    [System.IO.File]::WriteAllText($markerPath, ($marker | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
    Push-Location android
    try {
        & .\gradlew.bat bundleRelease lintRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { throw 'Android bundle or release lint failed.' }
    } finally { Pop-Location }
    $bundle = Join-Path $root 'android/app/build/outputs/bundle/release/app-release.aab'
    if (!(Test-Path -LiteralPath $bundle)) { throw 'No Android App Bundle was generated.' }
    Write-Output "Signed upload bundle: $bundle"
    Write-Output "SHA256: $((Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash)"
    Write-Output 'Upload to an internal testing track first. This build does not certify bank payments or Play approval.'
} finally {
    Pop-Location
    foreach ($key in $settings.Keys) { [Environment]::SetEnvironmentVariable($key, $old[$key], 'Process') }
}
