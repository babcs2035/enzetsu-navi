# 街頭演説ナビ (Enzetsu Navi)

日本の国政選挙において，各党・候補者の街頭演説場所を地図上にリアルタイム（1 時間更新）で可視化する Web アプリケーションである．
ユーザーは，現在地や指定した日時に開催される演説を直感的に把握できる．

## 🚀 主な機能

- **🗺️ インタラクティブな地図表示**
  - MapLibre GL JS を使用し，スムーズな地図操作を実現している．
  - GPS を利用して現在地周辺の演説を素早く確認できる．
- **🕒 タイムスライダー**
  - 過去から未来の演説スケジュールを，スライダー操作で時間軸に沿って確認できる．
  - 自動再生機能により，時系列での演説状況の変化を視覚的に追跡できる．
- **🤖 自動データ収集（スクレイピング）**
  - Playwright を使用し，主要政党の公式サイトから演説情報を 1 時間ごとに自動取得する．
  - 取得した情報は OpenAI API または Google Places API を用いてジオコーディング（住所から座標への変換）され，地図上にマッピングされる．
- **🔍 フィルタリング**
  - 特定の政党や候補者に絞って表示することができる．
- **📊 統計情報の表示**
  - 登録されている全演説数や，座標特定済みのデータ数などをリアルタイムで表示する．

## 🛠️ 技術スタック

本プロジェクトでは，パフォーマンス，型安全性，開発効率を重視したモダンな技術選定を行っている．

### フロントエンド
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Chakra UI](https://chakra-ui.com/), [Lucide React](https://lucide.dev/)
- **Map Library**: [MapLibre GL JS](https://maplibre.org/)

### バックエンド / インフラ
- **Server Actions**: Next.js 組み込みの API レイヤーを使用．
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Scraping**: [Playwright](https://playwright.dev/)
- **Job Scheduling**: `node-cron` による定期実行（スクレイピングタスク）．
- **Geocoding**: Google Maps Platform (Places API)
- **Containerization**: Docker, Docker Compose

### 開発ツール / CI
- **Linter/Formatter**: [Biome](https://biomejs.dev/) - 高速なリンター・フォーマッターとして採用．
- **Task Runner**: [mise](https://mise.jdx.dev/) - ツールバージョン管理およびタスクランナー．
- **CI/CD**: GitHub Actions (Lint, TypeCheck, Build, Deploy)

## 📂 ディレクトリ構成

```bash
src/
├── actions/       # Server Actions（データ取得，スクレイピング実行などのバックエンドロジック）
├── app/           # Next.js App Router のページ定義
├── components/    # 再利用可能な UI コンポーネント
│   ├── FilterPanel.tsx # 政党フィルタリング用パネル
│   ├── MapView.tsx     # 地図表示コンポーネント（MapLibre）
│   ├── SpeechList.tsx  # 演説リスト表示コンポーネント
│   └── ...
├── lib/           # ユーティリティ，定数，API クライアント設定
│   ├── server/    # サーバーサイド専用ロジック（スクレイパー，ジオコーディング）
│   └── ...
├── store/         # Zustand によるグローバル状態管理（フィルター設定など）
└── types/         # TypeScript 型定義
```

## 💻 開発環境セットアップ

本プロジェクトでは `mise` を使用してツールバージョンを管理している．

### 前提条件

- [mise](https://mise.jdx.dev/) (推奨)，または Node.js, pnpm, Docker がインストールされていること．

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd enzetsu-navi-frontend
   ```

2. **依存関係のインストール**
   ```bash
   mise install
   pnpm install
   ```

3. **環境変数の設定**
   `.env.sample` を `.env` にコピーし，必要な値を設定する．
   ```bash
   cp .env.sample .env
   ```
   - `DATABASE_URL`: PostgreSQL への接続 URL．
   - `GOOGLE_PLACES_API_KEY`: ジオコーディングに使用する Google Maps API キー（必須）．

4. **開発サーバーの起動**
   ```bash
   mise dev
   ```
   - Docker で PostgreSQL コンテナが起動し，マイグレーションが適用される．
   - Next.js の開発サーバーがポート 3000 で起動する．
   - 初回起動時に自動的にスクレイピングタスクが実行される．

5. **アクセスの確認**
   ブラウザで `http://localhost:3000/enzetsu-navi` にアクセスする．

### その他のコマンド

- **Lint & Format**: `mise run lint` (Biome を実行)
- **Type Check**: `mise run check` (TypeScript の型チェックを実行)
- **Docker Production Run**: `mise run docker` (本番環境同様の構成で Docker を起動)

## 🚀 デプロイ

GitHub Actions を利用して VPS 等への自動デプロイパイプラインを構築している．

1. **コンテナイメージのビルド**: `main` ブランチへのプッシュをトリガーに Docker イメージをビルドする．
2. **レジストリへのプッシュ**: GitHub Container Registry (ghcr.io) へイメージをプッシュする．
3. **デプロイ**: SSH 経由でサーバーに接続し，`docker-compose` を用いて最新のイメージを展開する．

## 📄 ライセンス

MIT License
