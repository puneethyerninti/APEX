param([Parameter(Mandatory = $true)][string]$Directory, [string]$KeyAlias = 'apex-upload')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$full = [IO.Path]::GetFullPath($Directory)
if ($full.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or $full -eq $root) { throw 'The signing directory must be outside the repository.' }
if (!(Get-Command keytool -ErrorAction SilentlyContinue)) { throw 'Configure JDK keytool first.' }
[IO.Directory]::CreateDirectory($full) | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner([Security.Principal.WindowsIdentity]::GetCurrent().User)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule('SYSTEM', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
Set-Acl -LiteralPath $full -AclObject $acl
$key = Join-Path $full 'upload.jks'
$secret = Join-Path $full 'signing-credential.xml'
if ((Test-Path -LiteralPath $key) -or (Test-Path -LiteralPath $secret)) { throw 'Signing material already exists. Do not overwrite the upload identity.' }
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$password = [Convert]::ToBase64String($bytes)
$oldStore = $env:APEX_STORE_PASSWORD; $oldKey = $env:APEX_KEY_PASSWORD
try {
  $env:APEX_STORE_PASSWORD = $password; $env:APEX_KEY_PASSWORD = $password
  & keytool -genkeypair -keystore $key -storetype JKS -alias $KeyAlias -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=APEX Upload, OU=Mobile Release, O=APEX, C=IN' -storepass:env APEX_STORE_PASSWORD -keypass:env APEX_KEY_PASSWORD -noprompt
  if ($LASTEXITCODE -ne 0) { throw 'Upload key generation failed.' }
  $credential = New-Object Management.Automation.PSCredential($KeyAlias, (ConvertTo-SecureString $password -AsPlainText -Force))
  $credential | Export-Clixml -LiteralPath $secret
  & keytool -exportcert -rfc -keystore $key -alias $KeyAlias -storepass:env APEX_STORE_PASSWORD -file (Join-Path $full 'upload-certificate.pem')
  if ($LASTEXITCODE -ne 0) { throw 'Public upload certificate export failed.' }
  Write-Output "Private upload key: $key"
  Write-Output "Windows-protected credential: $secret"
  Write-Output 'Back up these files securely. The encrypted credential is tied to this Windows user and computer; never commit it.'
} finally {
  $env:APEX_STORE_PASSWORD = $oldStore; $env:APEX_KEY_PASSWORD = $oldKey; $password = $null; [Array]::Clear($bytes, 0, $bytes.Length)
}
