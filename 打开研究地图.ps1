param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$appDirectory = $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port"
$minimumNodeVersion = [version]'22.12.0'
$userDirectory = [Environment]::GetFolderPath('UserProfile')
$runtimeRoot = Join-Path $userDirectory '.cache/codex-runtimes'
$runtimeDirectories = @()
if (Test-Path -LiteralPath $runtimeRoot) {
    $runtimeDirectories = @(Get-ChildItem -LiteralPath $runtimeRoot -Directory | Sort-Object { $_.Name -ne 'codex-primary-runtime' }, Name)
}

function Find-NodeExecutable {
    $candidates = @()
    $command = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { $candidates += $command.Source }
    foreach ($runtimeDirectory in $runtimeDirectories) {
        $candidates += Join-Path $runtimeDirectory.FullName 'dependencies/node/bin/node.exe'
        $candidates += Join-Path $runtimeDirectory.FullName 'dependencies/node/bin/node'
    }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        try {
            $nodeVersion = (& $candidate --version).Trim().TrimStart('v')
            if ($LASTEXITCODE -eq 0 -and [version]$nodeVersion -ge $minimumNodeVersion) { return $candidate }
        } catch { continue }
    }
    throw '需要 Node.js 22.12 或更新版本。安装 Node.js 后重新运行。'
}

function Invoke-ProjectNpm {
    param([string[]]$NpmArguments)
    $command = Get-Command npm -ErrorAction SilentlyContinue | Select-Object -First 1
    $cliCandidates = @()
    if ($command -and $command.Source) {
        $cliCandidates += Join-Path (Split-Path $command.Source -Parent) 'node_modules/npm/bin/npm-cli.js'
    }
    $nodeDirectory = Split-Path $nodeExecutable -Parent
    $cliCandidates += Join-Path $nodeDirectory 'node_modules/npm/bin/npm-cli.js'
    $cliCandidates += Join-Path (Split-Path $nodeDirectory -Parent) 'node_modules/npm/bin/npm-cli.js'
    foreach ($runtimeDirectory in $runtimeDirectories) {
        $cliCandidates += Join-Path $runtimeDirectory.FullName 'dependencies/node/node_modules/npm/bin/npm-cli.js'
    }
    $npmCli = $cliCandidates | Select-Object -Unique | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if ($npmCli) { & $nodeExecutable $npmCli @NpmArguments }
    elseif ($command) { & $command.Source @NpmArguments }
    else { throw '未找到 npm。请安装包含 npm 的 Node.js，再运行 npm ci。' }
    if ($LASTEXITCODE -ne 0) { throw "npm $($NpmArguments -join ' ') 执行失败。" }
}

function Test-ResearchMapServer {
    try {
        $response = Invoke-WebRequest -Uri $url -NoProxy -TimeoutSec 3 -ErrorAction Stop
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>芯片产业链'
    } catch { return $false }
}

$nodeExecutable = Find-NodeExecutable
$previousPath = $env:PATH
try {
    $env:PATH = (Split-Path $nodeExecutable -Parent) + [IO.Path]::PathSeparator + $previousPath
    Push-Location -LiteralPath $appDirectory
    try {
        $viteEntry = Join-Path $appDirectory 'node_modules/vite/bin/vite.js'
        if (-not (Test-Path -LiteralPath $viteEntry)) { Invoke-ProjectNpm -NpmArguments @('ci') }
        & $nodeExecutable (Join-Path $appDirectory 'scripts/copy-cesium.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Cesium 本地资源准备失败。' }
        if (-not (Test-ResearchMapServer)) {
            $logDirectory = Join-Path $appDirectory '.runtime'
            New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
            $startOptions = @{
                FilePath = $nodeExecutable
                ArgumentList = @('"' + $viteEntry + '"', '--host', '127.0.0.1', '--port', "$port", '--strictPort')
                WorkingDirectory = $appDirectory
                RedirectStandardOutput = Join-Path $logDirectory 'server.log'
                RedirectStandardError = Join-Path $logDirectory 'server.error.log'
                PassThru = $true
            }
            if ($IsWindows) { $startOptions.WindowStyle = 'Hidden' }
            $process = Start-Process @startOptions
            Set-Content -LiteralPath (Join-Path $logDirectory 'server.pid') -Value $process.Id
            $started = $false
            for ($attempt = 0; $attempt -lt 20; $attempt++) {
                if (Test-ResearchMapServer) { $started = $true; break }
                if ($process.HasExited) { break }
                Start-Sleep -Milliseconds 250
            }
            if (-not $started) { throw "服务启动失败，查看 $logDirectory/server.error.log。" }
        }
    } finally { Pop-Location }
} finally { $env:PATH = $previousPath }
Write-Output $url
if (-not $NoBrowser -and -not $env:RESEARCH_MAP_NO_BROWSER) { Start-Process $url }
