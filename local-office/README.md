# 手元のPCでONLYOFFICEを起動する

レンタルサーバーを使わず、PCで無料のONLYOFFICE Docs Community版、保存用サービス、HTTPSゲートウェイを起動します。編集部屋からWordのページ、Excelのシート、PowerPointのスライドを表示したまま共同編集できます。Microsoft Office本体ではなくONLYOFFICEの画面です。

追加のサーバー契約・有料ライセンス・独自ドメインは不要です。PCの電気代、既存Supabaseの保存容量・通信量は発生します。既存クラウドの無料枠内で試す前提であり、学校システム全体の料金が永続的に0円になる保証ではありません。無料版は同時編集接続20まで。AGPLとブランド表示を維持する条件で利用してください。

## 用意するもの

- Windows 11のPC（またはLinux）。PC全体で8GB以上のメモリ、40GB以上の空き容量を目安にしてください。
- PCでDocker Engineを実行する環境。WindowsではWSL2のUbuntuに無料のDocker Engineを入れる手順を推奨します。
- GitHubから最新の学校リポジトリを取得したフォルダ。
- 共同利用する場合は、メンバー全員が同じネットワーク内から接続先PCに届くこと。

Docker Desktopには企業規模などに応じた有料条件があります。会社のPCで「Docker Desktopも必ず無料」とは言えないため、以下ではDocker Desktopを必要としない手順を示します。会社のPCでは管理者の利用ルールに従ってください。

## 1. WindowsにWSLのUbuntuを用意

管理者PowerShellで実行します。既にUbuntuがあれば省略できます。

```powershell
wsl --install -d Ubuntu
```

再起動後、Ubuntuを開いてLinuxのユーザー名・パスワードを設定します。Ubuntuターミナルで、取得したリポジトリの `local-office` フォルダに移動してください。例（Windowsのユーザー名と保存場所は置き換えます）：

```bash
cd /mnt/c/Users/あなたのユーザー名/Desktop/digital-engineer-school/local-office
bash install-docker-ubuntu.sh
```

公式DockerのUbuntu aptリポジトリからEngineとComposeをインストールします。既にDocker Engineが動いていればインストールは不要です。インストールの際はUbuntuのパスワード入力が必要です。

## 2. ONLYOFFICEを起動

同じUbuntuターミナルで実行します。

```bash
bash setup.sh
```

最初は `localhost` を入力して自分のPCだけで試せます。共同利用する場合は、Windowsの `ipconfig` に表示される接続先PCのIPv4アドレス（例：`192.168.1.10`）を入力してください。JWT秘密鍵は自動生成し `.env` に保存します。鍵を学校の設定画面やGitHubに貼り付ける必要はありません。

初回のイメージ取得・ONLYOFFICE起動には数分かかります。

```bash
sudo docker compose ps
sudo docker compose logs --tail=40 documentserver
```

### Windowsで他のPCからも使う場合

WSLの標準NATでは、localhostから開けても他のPCから届かないことがあります。管理者PowerShellで、利用するネットワークがプライベートに設定されていることを確認してから、必要なポートだけ転送します。

```powershell
$officeWslAddress = ((wsl -d Ubuntu hostname -I).Trim() -split '\s+')[0]
netsh interface portproxy add v4tov4 listenport=8443 listenaddress=0.0.0.0 connectport=8443 connectaddress=$officeWslAddress
New-NetFirewallRule -DisplayName "School ONLYOFFICE LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8443 -Profile Private -RemoteAddress LocalSubnet
```

WSL再起動で内部IPが変わった場合は転送設定を更新してください。接続先のWindows側IPも固定するか、ルーターのDHCP予約を使うと安定します。ルーターでインターネットへポート開放する必要はありません。

## 3. HTTPS証明書を登録

学校はHTTPSなので、PC側もHTTPSが必要です。ゲートウェイはこのPC専用の認証局で証明書を発行します。Ubuntuターミナルで公開証明書だけを取り出します。

```bash
sudo docker compose cp gateway:/data/caddy/pki/authorities/local/root.crt ./root.crt
```

Windowsのエクスプローラーでこのフォルダの `root.crt` をダブルクリックし、「証明書のインストール」→「現在のユーザー」→「証明書をすべて次のストアに配置」→「信頼されたルート証明機関」を選んで登録してください。共同利用するメンバーのPCにも同じ `root.crt` を渡して登録します。ブラウザを閉じて開き直してください。PCが管理されていて登録できない場合は管理者へ依頼します。

共有するのは `root.crt` だけです。認証局の秘密鍵や `.env` は共有しません。

ブラウザで、例えば以下を開きます。

```text
https://localhost:8443/api/health
https://192.168.1.10:8443/api/health
```

自分が設定した接続先に対応する方を使い、証明書エラーなしで `"ready":true` と表示されれば接続準備完了です。`false` の場合はONLYOFFICEの起動を待ちます。ブラウザが「ローカルネットワークへのアクセス」を確認した場合は、この学校からPCへの接続を許可してください。

## 4. 編集部屋へ接続

1. 学校へログインして、対象プロジェクトの編集部屋を開きます。
2. 「ONLYOFFICE接続」に `https://PCのアドレス:8443` を登録します。
3. Word・Excel・PowerPointを読み込むか、既存ファイルを開きます。
4. 初回の切り替えは、他のメンバーが簡易編集の保存を終えてから行ってください。編集者はレイアウト編集で開かれます。既存の簡易編集で保存した文字変更も、初回に引き継ぎます。
5. メンバーが同じファイルを開くと同じ共同編集セッションへ接続します。閲覧者は閲覧モードです。未移行のファイルは最初に編集者が開いてください。
6. 「プロジェクトに保存」でクラウドの元ファイルまで保存されたことを確認します。ONLYOFFICE内の保存ボタンでも保存要求が行われ、最後の利用者が終了した時も保存します。

レイアウト編集を始めたファイルは、以降ONLYOFFICEで編集します。簡易編集とレイアウト編集の同時上書きを防ぎます。接続設定を空欄に戻しても、移行済みファイルが簡易編集へ自動的に戻ることはありません。

既存Supabaseのプロジェクト権限と非公開Storageを使用します。サービスロールキーは不要です。ログイン済み利用者の短期トークンを保存サービスのメモリだけに保持し、利用中に更新します。秘密鍵・ログイントークンを公開サイトのコードに入れません。

## 5. 利用を終える・次回起動

保存完了を確認してから、編集画面を閉じます。終了時の保存処理に少し時間がかかるため、PCの電源をすぐに切らないでください。

```bash
sudo docker compose stop
sudo service docker start
sudo docker compose up -d
```

最初の行が停止、残りが次回起動です。 `docker compose down -v` は保存データと証明書を削除するため、通常の停止に使わないでください。

## 保存待ち・復旧

ログイン期限切れ、ネット切断、クラウドの権限変更・競合で保存できなかった場合、保存用サービスは受け取った編集ファイルをDockerの `bridge-data` ボリュームへ残し、保存失敗をONLYOFFICEに返します。編集者が再接続すると、その権限で保存を再試行します。再試行後に「もう一度開いてください」が出た場合は再接続してください。

自動復旧できない場合は、ボリューム内の `*.saved` を取り出せます。拡張子を元の `.docx` / `.xlsx` / `.pptx` に戻してOfficeで確認できます。 `*.json` の `pending.file` が保存待ちファイル名です。

```bash
sudo docker compose cp bridge:/data ./office-recovery
```

バックアップはこの復旧フォルダに加えてDockerの永続ボリューム・`.env`を安全な場所へ保管してください。保存ファイルは復旧用に保持するので、PCの空き容量を定期的に確認してください。編集用PCが停止している間、メンバーはONLYOFFICEで編集できません。

## 離れた場所からの共同利用

上記は同じLAN内の構成です。別の場所から使う場合は、会社が許可する既存VPN、または無料のWireGuardなどでPCへの経路を用意します。接続先URLだけを登録してもLANのPCへ外部から届くようにはなりません。Tailscale等の無料プランは用途・人数の条件があるので、会社用途で無条件に無料とは扱いません。

## 公式資料

- https://helpcenter.onlyoffice.com/docs/installation/docs-community-install-docker.aspx
- https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/
- https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/
- https://helpcenter.onlyoffice.com/ja/docs/faq/docs-community.aspx
- https://docs.docker.com/engine/install/ubuntu/
