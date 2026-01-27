# 街頭演説ナビ (Enzetsu Navi)

日本の国政選挙において、各党・候補者の街頭演説場所を地図上にリアルタイム（1時間更新）で可視化する Web アプリケーション。

## 主な機能

- 🗺️ **地図表示**: MapLibre GL JS を使用したインタラクティブな地図。
- 🕒 **タイムスライダー**: 過去・未来の演説スケジュールを時間軸で確認。
- 🤖 **自動収集**: Playwright を使用した政党公式サイトからのデータスクレイピング（1時間毎）。
- 🔍 **フィルタリング**: 政党や候補者ごとの絞り込み表示。
- 📊 **統計情報**: 現在地の演説数などの統計表示。

## 技術スタック

- **Frontend**: Next.js (App Router), React, MapLibre GL JS, Chakra UI, Zustand
- **Backend**: Next.js Server Actions, Prisma (ORM)
- **Database**: PostgreSQL
- **Scraping**: Playwright
- **Infrastructure**: Docker, Docker Compose
- **CI/CD**: GitHub Actions (Lint, TypeCheck, Build, Deploy)

## 開発環境セットアップ

このプロジェクトは `mise` を使用してツールバージョンを管理しています。

### 前提条件

- [mise](https://mise.jdx.dev/) (推奨) または Node.js, pnpm, Docker

### 手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd enzetsu-navi-frontend
   ```

2. **依存関係とツールチェーンのセットアップ**
   ```bash
   mise install
   pnpm install
   ```

3. **環境変数の設定**
   `.env.sample` を `.env` にコピーし、必要な値を設定してください。
   ```bash
   cp .env.sample .env
   ```
   - `GOOGLE_PLACES_API_KEY`: ジオコーディングに使用（必須）
   - `APP_PORT`: アプリケーションのポート（任意、デフォルト: 3000）

4. **開発サーバーの起動**
   ```bash
   mise dev
   ```
   - Docker で PostgreSQL が起動し、Next.js 開発サーバーが立ち上がります。
   - 初回起動時に自動的にスクレイピングが実行されます。
   - アクセス: `http://localhost:3000/enzetsu-navi`（または設定した `APP_PORT`）

### その他のコマンド

- `mise run lint`: コードの整形とLintチェック (Biome)
- `mise run check`: 型チェックを含む全チェック
- `mise run docker`: 本番同様の構成（App + DB）をDockerで起動

## デプロイ

GitHub Actions を使用して VPS への自動デプロイを設定しています。

1. **GitHub Secrets の設定**
   - `DEPLOY_HOST`: VPS のホスト名/IP
   - `DEPLOY_USER`: SSH ユーザー
   - `DEPLOY_KEY`: SSH 秘密鍵
   - `DEPLOY_PORT`: SSH ポート
   - `DEPLOY_TARGET`: デプロイ先のディレクトリパス

2. **デプロイフロー**
   - `main` ブランチへのプッシュでトリガーされます。
   - Docker Image をビルドし、GitHub Container Registry (`ghcr.io`) にプッシュします。
   - VPS 上で `docker-compose.production.yml` を使用して最新のイメージをプル・起動します。

## ディレクトリ構成

- `src/app`: Next.js App Router ページ
- `src/actions`: Server Actions (バックエンドロジック)
- `src/components`: UIコンポーネント
- `src/lib`: ユーティリティ、DB接続、スクレイピングロジック
- `src/store`: Zustand ストア
- `database`: DB初期化スクリプト
- `.github`: GitHub Actions ワークフロー

## ライセンス

MIT License
