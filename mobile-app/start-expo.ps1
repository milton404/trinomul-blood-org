$ErrorActionPreference = "Continue"
$log = "D:\trinomul-blood-bank-rangpur\mobile-app\expo-out.log"
$err = "D:\trinomul-blood-bank-rangpur\mobile-app\expo-err.log"
$p = Start-Process -FilePath "D:\trinomul-blood-bank-rangpur\mobile-app\node_modules\.bin\expo.cmd" -ArgumentList "start" -WorkingDirectory "D:\trinomul-blood-bank-rangpur\mobile-app" -RedirectStandardOutput $log -RedirectStandardError $err -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 25
Write-Output ("ProcessId: " + $p.Id)
Write-Output ("HasExited: " + $p.HasExited)
Write-Output "--- PORT ---"
$conn = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($conn) { $conn | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize } else { Write-Output "8081 not listening" }
Write-Output "--- OUT LOG ---"
if (Test-Path $log) { Get-Content $log -Tail 40 }
Write-Output "--- ERR LOG ---"
if (Test-Path $err) { Get-Content $err -Tail 40 }