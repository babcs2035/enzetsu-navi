# 街頭演説ナビ (Enzetsu Navi)

日本の国政選挙において，各党・候補者の街頭演説場所を地図上にリアルタイム（1時間更新）で可視化する Web アプリケーション．
Next.js によるフルスタック構成で実装されています。

## 機能

- 📍 地図上での街頭演説場所の可視化
- 🕐 時間軸スライダーによる演説の振り返り
- 🎨 政党別カラーコードによるマーカー表示
- 🔍 政党・候補者によるフィルタリング
- 🤖 **自動スクレイピング**: 定期的に政党の公式サイトを巡回して情報を更新（Cron搭載）

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **Map**: MapLibre GL JS (OpenStreetMap)
- **UI**: Chakra UI
- **Scraping**: Playwright
- **Lint/Format**: Biome
- **Task Runner**: mise

## クイックスタート

**1. セットアップ**
```bash
mise run setup
```

**2. 環境設定**
`.env.sample` を `.env` にコピーし、APIキー等を設定してください。
```bash
cp .env.sample .env
```

**3. 開発サーバー起動**
```bash
mise dev
```
DBコンテナが自動起動し、http://localhost:3000 にアクセスできます。

## 主要コマンド

`mise tasks` でコマンド一覧を確認できます。

| コマンド             | 説明                                    |
| -------------------- | --------------------------------------- |
| `mise dev`           | 開発サーバー起動 (HMR + Cron)           |
| `mise run check`     | コード品質チェック (Biome + TypeScript) |
| `mise run db:studio` | DB管理画面 (Prisma Studio)              |
| `mise docker`        | 本番構成でのDocker起動                  |

## ディレクトリ構造

```
enzetsu-navi/
├── prisma/             # DBスキーマ
├── database/           # DB初期化SQL
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # UIコンポーネント
│   ├── lib/            # ロジック (API, Scraping, Cron)
│   └── instrumentation.ts # Cron起動フック
├── biome.json          # Formatter/Linter設定
└── mise.toml           # タスク定義
```

## ライセンス

MIT License
