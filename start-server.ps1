$ErrorActionPreference = "Stop"

$workDir = "D:\AI-Projects\work"
$nodeDir = "$env:USERPROFILE\tools\node-v24.22.0-win-x64"
$url = "http://localhost:3000"

# Не запускать повторно, если сервер уже отвечает.
try {
    $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
        Write-Output "Server already responds: $url"
        exit 0
    }
} catch {}

# Создать отдельный командный файл запуска.
$launcher = Join-Path $workDir "run-dev-detached.cmd"

@"
@echo off
set "PATH=$nodeDir;%PATH%"
set "DB_PATH=$workDir\test.db"
cd /d "$workDir"
call "$nodeDir\npm.cmd" run dev >> "$workDir\server.log" 2>&1
"@ | Set-Content -LiteralPath $launcher -Encoding ASCII

# Создать процесс через WMI, вне дерева процессов OpenCode.
$commandLine = 'cmd.exe /d /c "' + $launcher + '"'

$result = Invoke-CimMethod `
    -ClassName Win32_Process `
    -MethodName Create `
    -Arguments @{ CommandLine = $commandLine }

if ($result.ReturnValue -ne 0) {
    throw "WMI process creation failed: $($result.ReturnValue)"
}

$result.ProcessId | Set-Content "$workDir\server.pid" -Encoding ASCII

Write-Output "Detached server launcher started. PID: $($result.ProcessId)"
exit 0