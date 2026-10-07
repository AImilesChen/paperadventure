$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$clientRoot = Join-Path $projectRoot 'dist/client'
$outputRoot = Join-Path $projectRoot 'output'
$archive = Join-Path $outputRoot 'paper-adventure-preview.zip'

if (-not (Test-Path -LiteralPath (Join-Path $clientRoot 'en/index.html'))) {
  throw 'Build the pre-rendered site with npm run build before packaging.'
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -Path (Join-Path $clientRoot '*') -DestinationPath $archive -CompressionLevel Optimal
Write-Host "Preview upload package: $archive"
