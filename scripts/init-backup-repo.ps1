# scripts/init-backup-repo.ps1
#
# Inicializa o workspace como repositório git com LFS e configura o remote
# para receber os snapshots do backup automático (código + %AppData%).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\init-backup-repo.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\init-backup-repo.ps1 -RemoteUrl "https://github.com/<you>/<repo>.git"
#
# Idempotente: pode rodar mais de uma vez; só faz o que falta.

[CmdletBinding()]
param(
    [string]$RemoteUrl = "",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ">> $msg" -ForegroundColor Cyan
}

function Ensure-Command($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "Comando '$name' não encontrado no PATH. Instale antes de rodar esse script."
    }
}

$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $WorkspaceRoot

Write-Step "Workspace: $WorkspaceRoot"

Ensure-Command git
Ensure-Command "git-lfs"

# ---------- git init ----------
if (-not (Test-Path (Join-Path $WorkspaceRoot ".git"))) {
    Write-Step "git init (branch inicial = $Branch)"
    git init -b $Branch | Out-Null
} else {
    Write-Step ".git já existe — pulando git init"
}

# ---------- git lfs ----------
Write-Step "git lfs install"
git lfs install | Out-Null

# ---------- .gitignore ----------
$gitignorePath = Join-Path $WorkspaceRoot ".gitignore"
$requiredIgnores = @(
    "node_modules/",
    "dist/",
    "dist-ssr/",
    "*.local",
    ".DS_Store",
    "*.log",
    ".env",
    ".env.local",
    ".env.*.local",
    "src-tauri/target/",
    "src-tauri/gen/schemas/",
    "src-tauri/WixTools/",
    ".vscode/*",
    "!.vscode/extensions.json",
    "!.vscode/settings.json",
    "*.tsbuildinfo",
    "# Backup volatile files (WAL/SHM do SQLite não devem entrar no snapshot)",
    "backup/**/*.db-shm",
    "backup/**/*.db-wal",
    "backup/**/*.tmp"
)

if (-not (Test-Path $gitignorePath)) {
    Write-Step "Criando .gitignore"
    $requiredIgnores | Set-Content -Path $gitignorePath -Encoding UTF8
} else {
    Write-Step "Atualizando .gitignore (adicionando padrões faltantes)"
    $existing = Get-Content $gitignorePath -ErrorAction SilentlyContinue
    $toAppend = $requiredIgnores | Where-Object { $_ -notin $existing }
    if ($toAppend.Count -gt 0) {
        Add-Content -Path $gitignorePath -Value "" -Encoding UTF8
        $toAppend | Add-Content -Path $gitignorePath -Encoding UTF8
    }
}

# ---------- .gitattributes (LFS) ----------
# Assets binários pesados + o elysium.db (SQLite) vão pro LFS. O WAL/SHM
# ficam fora do repo (ignorados) pra evitar duelo com o checkpoint.
$gitattributesPath = Join-Path $WorkspaceRoot ".gitattributes"
$lfsPatterns = @(
    "*.png filter=lfs diff=lfs merge=lfs -text",
    "*.jpg filter=lfs diff=lfs merge=lfs -text",
    "*.jpeg filter=lfs diff=lfs merge=lfs -text",
    "*.gif filter=lfs diff=lfs merge=lfs -text",
    "*.webp filter=lfs diff=lfs merge=lfs -text",
    "*.wav filter=lfs diff=lfs merge=lfs -text",
    "*.mp3 filter=lfs diff=lfs merge=lfs -text",
    "*.ogg filter=lfs diff=lfs merge=lfs -text",
    "*.flac filter=lfs diff=lfs merge=lfs -text",
    "*.db filter=lfs diff=lfs merge=lfs -text",
    "*.sqlite filter=lfs diff=lfs merge=lfs -text",
    "*.psd filter=lfs diff=lfs merge=lfs -text",
    "*.aseprite filter=lfs diff=lfs merge=lfs -text"
)
if (-not (Test-Path $gitattributesPath)) {
    Write-Step "Criando .gitattributes (regras LFS)"
    $lfsPatterns | Set-Content -Path $gitattributesPath -Encoding UTF8
} else {
    Write-Step "Atualizando .gitattributes (adicionando padrões LFS faltantes)"
    $existing = Get-Content $gitattributesPath -ErrorAction SilentlyContinue
    $toAppend = $lfsPatterns | Where-Object { $_ -notin $existing }
    if ($toAppend.Count -gt 0) {
        Add-Content -Path $gitattributesPath -Value "" -Encoding UTF8
        $toAppend | Add-Content -Path $gitattributesPath -Encoding UTF8
    }
}

# ---------- backup/ placeholder ----------
$backupDir = Join-Path $WorkspaceRoot "backup"
if (-not (Test-Path $backupDir)) {
    Write-Step "Criando pasta backup/"
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$keepFile = Join-Path $backupDir ".gitkeep"
if (-not (Test-Path $keepFile)) {
    New-Item -ItemType File -Path $keepFile | Out-Null
}

# ---------- remote ----------
# Suprime $ErrorActionPreference='Stop' só pra essa seção (git escreve em stderr
# quando o remote não existe e isso não é um erro real).
$savedEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

if ($RemoteUrl -ne "") {
    $existingRemote = & git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0 -and $existingRemote) {
        if ($existingRemote -ne $RemoteUrl) {
            Write-Step "Atualizando remote origin: $existingRemote -> $RemoteUrl"
            & git remote set-url origin $RemoteUrl
        } else {
            Write-Step "Remote origin ja configurado: $existingRemote"
        }
    } else {
        Write-Step "Configurando remote origin -> $RemoteUrl"
        & git remote add origin $RemoteUrl
    }
} else {
    Write-Step "Sem -RemoteUrl: pulei a configuracao do remote. Rode novamente com -RemoteUrl 'https://github.com/<voce>/<repo>.git' para habilitar push."
}

# ---------- commit inicial ----------
$hasCommit = & git rev-parse --verify HEAD 2>$null
if (-not $hasCommit -or $LASTEXITCODE -ne 0) {
    Write-Step "Fazendo commit inicial"
    & git add .gitignore .gitattributes
    if (Test-Path $keepFile) { & git add backup/.gitkeep }
    & git commit -m "chore(backup): init repo with LFS + backup/ placeholder" | Out-Null
} else {
    Write-Step "Repo ja tem commits - pulando commit inicial"
}

$ErrorActionPreference = $savedEAP

Write-Host ""
Write-Host "Pronto." -ForegroundColor Green
Write-Host "Próximos passos:" -ForegroundColor Green
Write-Host "  1. Se você ainda não passou -RemoteUrl, rode: git remote add origin https://github.com/<voce>/<repo>.git"
Write-Host "  2. git push -u origin $Branch"
Write-Host "  3. Use o botao 'Backup agora' no app ou aprove qualquer etapa - o snapshot vai pra backup/ e sobe via LFS."
