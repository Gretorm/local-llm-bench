# Serves this folder on http://localhost:8000 and opens it in the default browser.
# Stop the server with Ctrl+C.
$ErrorActionPreference = 'Stop'
$port = 8000
$root = $PSScriptRoot

Write-Host "Serving Blockcraft at http://localhost:$port/  (Ctrl+C to stop)"
Start-Sleep 1
Start-Process "http://localhost:$port/"

python -m http.server $port --directory $root
