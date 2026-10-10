$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Test-Path .env) {
 Write-Host "既存の.envを使用します。接続先の変更は.envのOFFICE_HOSTを編集してください。"
} else {
 $officeHostName = Read-Host "接続先PCのIPv4アドレス（自分だけで試す場合はlocalhost）"
 if ([string]::IsNullOrWhiteSpace($officeHostName)) { $officeHostName = "localhost" }
 if ($officeHostName -ne 'localhost' -and $officeHostName -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { throw "localhostまたはIPv4アドレスを入力してください" }
 $secretBytes = New-Object byte[] 48
 $randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
 $randomGenerator.GetBytes($secretBytes)
 $officeJwtSecret = [Convert]::ToBase64String($secretBytes)
 "OFFICE_HOST=$officeHostName`nJWT_SECRET=$officeJwtSecret" | Set-Content -Encoding ascii .env
 $randomGenerator.Dispose()
}
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "起動できませんでした。Docker Engineが動いているか確認してください" }
Write-Host "初回は数分かかります。READMEの証明書登録後、編集部屋の『ONLYOFFICE接続』を設定してください。"
