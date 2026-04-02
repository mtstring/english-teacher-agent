# English Teacher Agent「Lisa」

Discord で動くパーソナル英語コーチ。ギャル×ドSな英語の先生「Lisa」が TOEIC 学習をサポートする。

## アーキテクチャ

```
[スマホ / PC ブラウザ]
       │
  [GitHub Pages]  ← PWA 静的ファイル配信
       │ supabase-js
  [Supabase PostgreSQL]  ← progress テーブル
       │ supabase-js
  [ローカル Mac]
  ├─ Discord Bot       … Claude を使った英語 Q&A
  ├─ nag-check.ts      … 未学習セッションの煽り通知
  └─ weekly-report.ts  … 週次レポート送信
```

外部サービスは **Supabase**（DB）と **GitHub Pages**（PWA ホスティング）の 2 つのみ。

## 構成

```
├── discord-bot/        Discord Bot（Bun + discord.js）
│   └── src/
│       ├── index.ts    メッセージ受信 → Claude → 返信
│       └── claude.ts   Claude CLI 呼び出し・セッション管理
├── toeic-app/          TOEIC 学習 PWA（React + Vite + Tailwind）
│   └── src/
│       ├── components/ Dashboard / Quiz / Review / Diagnosis
│       ├── hooks/      useQuiz / useSRS / useSync
│       ├── db/         Dexie（IndexedDB）オフライン DB
│       └── data/       questions.json（TOEIC Part5 問題集）
├── scripts/            定期実行スクリプト（Bun + launchd）
│   ├── nag-check.ts    朝9時・昼14時・夜23時に煽りメッセージ
│   └── weekly-report.ts 日曜21時に週次レポート
├── knowledge/          Claude 用コンテキスト
│   ├── user-profile.md ユーザーの英語レベル・目標
│   ├── toeic-tips.md   TOEIC 攻略ノウハウ
│   └── exam-schedule.md 試験日程
├── CLAUDE.md           Lisa のシステムプロンプト
└── supabase-setup.sql  DB 初期化 SQL
```

## セットアップ

### 1. Supabase

[Supabase](https://supabase.com) でプロジェクトを作成し、SQL Editor で `supabase-setup.sql` を実行。

### 2. 環境変数

**discord-bot/.env**（`.env.example` を参照）:

```
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-channel-id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**toeic-app/.env**（GitHub Actions では Secrets に設定）:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 依存インストール

```bash
cd discord-bot && npm install
cd ../toeic-app && npm install
```

### 4. Discord Bot 起動

```bash
cd discord-bot && bun run start
```

常駐させる場合は launchd を使う:

```bash
cp discord-bot/com.english-teacher.discord-bot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.english-teacher.discord-bot.plist
```

### 5. 定期スクリプト（launchd）

```bash
cp scripts/*.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.english-teacher.nag-morning.plist
launchctl load ~/Library/LaunchAgents/com.english-teacher.nag-afternoon.plist
launchctl load ~/Library/LaunchAgents/com.english-teacher.nag-night.plist
launchctl load ~/Library/LaunchAgents/com.english-teacher.weekly-report.plist
```

### 6. PWA デプロイ

GitHub リポジトリの Settings で:

1. **Pages** → Source: GitHub Actions
2. **Secrets** → `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を追加
3. リポジトリ名がサブパスになる場合は **Variables** に `VITE_BASE_PATH=/english-teacher-agent/` を設定

`main` ブランチへの push で `toeic-app/` 配下に変更があれば自動デプロイされる。

## 前提条件

- macOS
- [Bun](https://bun.sh/)
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude` コマンドが PATH に必要)
- Discord Bot Token（[Discord Developer Portal](https://discord.com/developers/applications) で作成）
