ポーカーゲーム - オンライン対戦
リアルタイムでポーカー対戦が楽しめるオンラインゲームです！

機能
リアルタイムマルチプレイヤー対戦
WebSocketを使った即座の通信
ポーカーの全ての役に対応
チップ管理システム
カード交換（ドロー）機能
Renderへのデプロイ方法
方法1: render.yamlを使用（推奨）
GitHubにリポジトリをプッシュ
Renderダッシュボードで「New +」→「Blueprint」を選択
リポジトリを接続
自動的にrender.yamlの設定が読み込まれデプロイされます
方法2: 手動設定
Renderダッシュボードで「New +」→「Web Service」を選択

GitHubリポジトリを接続

以下の設定を入力：

Name: poker-game-online（任意の名前）
Environment: Node
Build Command: npm install
Start Command: npm start
Plan: Free（または他のプラン）
「Create Web Service」をクリック

ローカルでの実行
# 依存関係をインストール
npm install
# サーバーを起動
npm start

サーバーはデフォルトでポート5000で起動します（環境変数PORTで変更可能）。

技術スタック
バックエンド: Node.js + Express
リアルタイム通信: Socket.IO
フロントエンド: HTML/CSS/JavaScript
ゲームルール
「対戦相手を探す」ボタンをクリック
マッチング成立後、ベット額を入力
5枚のカードが配られます
交換したいカードをクリックして選択
「ドロー」ボタンで選択したカードを交換
役の強さで勝敗が決まります
Render特有の設定
このプロジェクトはRenderでのデプロイに最適化されています：

process.env.PORTを使用して動的ポート設定に対応
0.0.0.0にバインドして外部アクセスを許可
render.yamlでワンクリックデプロイに対応
ライセンス
MIT
