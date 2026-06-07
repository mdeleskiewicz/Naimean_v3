Set-Location "C:\Users\Mdele\source\repos\Naimean_v3"

try {
    Write-Host "--- STASHING ---" -ForegroundColor Yellow
    git stash

    Write-Host "--- PULLING ---" -ForegroundColor Cyan
    git pull --rebase origin main

    Write-Host "--- RESTORING ---" -ForegroundColor Yellow
    git stash pop

    Write-Host "--- PUSHING ---" -ForegroundColor Green
    git add .
    git commit -m "auto-sync: $(Get-Date)"
    git push origin main
}
finally {
    Write-Host "`n--- SYNC COMPLETE ---" -ForegroundColor Green
    Write-Host "Press ENTER to close this window..." -ForegroundColor White
    [System.Console]::ReadLine()
}