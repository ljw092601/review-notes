# 바탕화면에 ReviewNotes 바로가기를 만든다. 한 번만 실행하면 된다:
#   powershell -ExecutionPolicy Bypass -File scripts\make-shortcut.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'ReviewNotes.lnk'
$ps = (Get-Command powershell.exe).Source
$icon = Join-Path $root 'scripts\reviewnotes.ico'

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnk)
$sc.TargetPath = $ps
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\start.ps1`""
$sc.WorkingDirectory = $root
$sc.Description = '오답노트 서버를 켜고 크롬으로 연다'
if (Test-Path $icon) { $sc.IconLocation = "$icon,0" }
$sc.Save()
Write-Output "만들었어요: $lnk"
