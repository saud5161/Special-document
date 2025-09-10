param([string]$LogPath)

# إن ما انمرّر مسار لوق، نستخدم نفس مجلد السكربت
if (-not $LogPath) {
  $LogPath = Join-Path $PSScriptRoot 'macro_heartbeat.txt'
}

$base = $PSScriptRoot
$doc  = Join-Path $base 'NORMAL.docm'

$word = $null
$docObj = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  if (Test-Path $doc) {
    $docObj = $word.Documents.Open($doc, $false, $false)
    try { $word.Run("'$doc'!ForceCloseUserForms") } catch {
      try { $word.Run("ForceCloseUserForms") } catch { try { $word.Run("Normal.ForceCloseUserForms") } catch {} }
    }
  } else {
    $docObj = $word.Documents.Add()
    try { $word.Run("ForceCloseUserForms") } catch { try { $word.Run("Normal.ForceCloseUserForms") } catch {} }
  }

  if ($docObj) { $docObj.Close($true) }
} catch {
  # صامت
} finally {
  if ($word) { try { $word.Quit() } catch {} }
}

# نسجّل سطر وقت التشغيل في المسار الذي نمرّره من البرنامج (userData)
(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | Out-File -FilePath $LogPath -Encoding utf8 -Append
