# ReviewNotes 실행: 개발 서버가 안 떠 있으면 켜고, 크롬으로 앱을 연다.
# 바탕화면 바로가기(ReviewNotes.lnk)가 이 파일을 실행한다. 바로가기 만들기: scripts\make-shortcut.ps1
$ErrorActionPreference = 'Stop'
$port = 5173            # IndexedDB는 주소(포트)별로 저장되므로 포트를 고정한다
$url = "http://localhost:$port/"
$root = Split-Path -Parent $PSScriptRoot

function Test-Server {
  try { (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2) | Out-Null; return $true } catch { return $false }
}

if (-not (Test-Server)) {
  $npx = Join-Path (Split-Path -Parent (Get-Command node).Source) 'npx.cmd'
  Start-Process -FilePath $npx -ArgumentList "vite --port $port --strictPort" -WorkingDirectory $root -WindowStyle Minimized
  $deadline = (Get-Date).AddSeconds(40)
  while (-not (Test-Server)) {
    if ((Get-Date) -gt $deadline) {
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.MessageBox]::Show("서버가 40초 안에 뜨지 않았어요. 최소화된 'ReviewNotes' 창의 오류를 확인하세요.", 'ReviewNotes') | Out-Null
      exit 1
    }
    Start-Sleep -Milliseconds 300
  }
}

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $url } else { Start-Process $url }
