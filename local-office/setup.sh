#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then
 read -r -p '接続先PCのIPv4アドレス（自分だけで試す場合はlocalhost）: ' office_host_name
 office_host_name=${office_host_name:-localhost}
 if [[ "$office_host_name" != localhost && ! "$office_host_name" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  echo 'localhostまたはIPv4アドレスを入力してください'; exit 1
 fi
 umask 077
 office_jwt_secret=$(openssl rand -hex 48)
 printf 'OFFICE_HOST=%s\nJWT_SECRET=%s\n' "$office_host_name" "$office_jwt_secret" > .env
fi
sudo docker compose up -d
echo '初回は数分かかります。READMEの証明書登録後、編集部屋のONLYOFFICE接続を設定してください。'
