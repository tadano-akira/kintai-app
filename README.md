# 勤怠管理システム

小規模・中規模組織（〜50名）向けのサーバーレス勤怠管理システム。  
Google アカウント認証を前提とし、Firebase 上で完結するゼロサーバー構成を採用。

[![Deploy to Firebase](https://github.com/tadano-akira/kintai-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/tadano-akira/kintai-app/actions/workflows/deploy.yml)

---

## 機能一覧

### スタッフ
- 出退勤打刻（ワンタップ）
- 本日のステータスリアルタイム表示
- 月別勤怠確認
- 勤怠修正申請・休暇申請
- 有給残数確認

### 管理者
- 全社員勤怠一覧（月別・社員フィルター）
- 申請承認 / 却下（勤怠修正・休暇）
- 有給付与管理
- 月次締め（締め後は編集不可）
- CSV 出力（BOM 付き UTF-8、Excel 対応）
- 社員管理（名前・社員 ID の編集）

### 共通
- Google アカウントによるログイン
- ロール別ログイン URL（`/login/staff` / `/login/admin`）
- 管理者はスタッフ画面にも入れる（兼任対応）
- スマートフォン対応（レスポンシブ）

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| UI ライブラリ | Material UI (MUI) v9 |
| 認証 | Firebase Authentication（Google Sign-In） |
| データベース | Cloud Firestore（asia-northeast1） |
| サーバーサイド | Cloud Functions for Firebase v2（Node.js 20） |
| ホスティング | Firebase Hosting |
| CI/CD | GitHub Actions |

## システム構成

```
ブラウザ（React + MUI）
  │
  ├── Firebase Authentication  ← Google Sign-In
  │
  ├── Cloud Firestore          ← 勤怠データ（読み取りのみクライアントから）
  │
  ├── Cloud Functions（12関数） ← 全書き込み処理をサーバーで実行
  │     clockIn / clockOut
  │     approveAttendanceRequest / rejectAttendanceRequest
  │     approveLeaveRequest / rejectLeaveRequest
  │     grantLeave / getLeaveBalance
  │     closeMonthlyAttendance / reopenMonthlyAttendance
  │     exportAttendanceCsv / updateUser
  │
  └── Firebase Hosting         ← 本番環境配信
```

> **セキュリティ設計：** Firestore Security Rules でクライアントからの直接書き込みを禁止。すべての書き込みは Cloud Functions（Admin SDK）経由で実行。

---

## ディレクトリ構成

```
kintai-app/
├── .github/workflows/deploy.yml   # GitHub Actions（main push で自動デプロイ）
├── functions/
│   ├── src/index.ts               # Cloud Functions 全 12 関数
│   └── package.json
├── src/
│   ├── components/
│   │   ├── Layout.tsx             # AppBar + レスポンシブサイドバー
│   │   └── PrivateRoute.tsx       # 認証・ロールガード
│   ├── hooks/
│   │   ├── useAuth.ts             # 認証状態管理（onSnapshot でリアルタイム）
│   │   └── useLeaveBalance.ts     # 有給残数フック
│   ├── lib/
│   │   ├── firebase.ts            # Firebase 初期化
│   │   └── functions.ts           # Callable Function ラッパー
│   ├── pages/
│   │   ├── Login.tsx              # ロール別ログイン画面
│   │   ├── staff/
│   │   │   ├── Dashboard.tsx      # 打刻・ステータス・有給残数
│   │   │   ├── MyAttendance.tsx   # 月別勤怠一覧
│   │   │   ├── CorrectionRequest.tsx
│   │   │   └── LeaveRequest.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── AttendanceList.tsx
│   │       ├── Requests.tsx       # 申請承認
│   │       ├── LeaveGrants.tsx
│   │       ├── MonthlyClosing.tsx
│   │       ├── CsvExport.tsx
│   │       └── Users.tsx          # 社員管理
│   └── types/index.ts             # 全データモデルの型定義
├── firestore.rules                # Firestore Security Rules
├── firestore.indexes.json
├── firebase.json
└── .env.example                   # 環境変数テンプレート
```

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 20 以上
- Firebase プロジェクト（Blaze プラン）

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/tadano-akira/kintai-app.git
cd kintai-app

# 2. 依存関係をインストール
npm install
cd functions && npm install && cd ..

# 3. 環境変数を設定
cp .env.example .env.local
# .env.local に Firebase の設定値を記入（下記参照）

# 4. 開発サーバーを起動
npm run dev
```

`http://localhost:5173` でアクセス（ポートが使用中の場合は 5174）。

---

## Firebase セットアップ

### 1. プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com) でプロジェクトを作成
2. **Blaze プラン（従量課金）にアップグレード**（Cloud Functions の利用に必要）

### 2. Authentication

1. 「構築」→「Authentication」→「始める」
2. 「Sign-in method」→「Google」を有効化

### 3. Firestore Database

1. 「構築」→「Firestore Database」→「データベースを作成」
2. ロケーション：`asia-northeast1`（東京）
3. セキュリティルール：「本番環境モード」を選択

### 4. 環境変数の設定

Firebase Console →「プロジェクトの設定」→「マイアプリ」→ ウェブアプリを登録して `.env.local` に記入：

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.firebaserc` のプロジェクト ID も書き換える：

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 5. デプロイ

```bash
# Firebase CLI にログイン
npx firebase-tools login

# Firestore Security Rules をデプロイ
npx firebase-tools deploy --only firestore:rules,firestore:indexes

# Cloud Functions をビルド＆デプロイ
cd functions && npm run build && cd ..
npx firebase-tools deploy --only functions

# Hosting をデプロイ
npm run build
npx firebase-tools deploy --only hosting
```

### 6. 管理者ユーザーの設定

初回ログイン後、Firebase Console → Firestore → `users/{uid}` の `role` フィールドを `admin` に変更。

---

## CI/CD（GitHub Actions）

`main` ブランチへのプッシュで Hosting・Functions が自動デプロイされます。

GitHub リポジトリの **Settings → Secrets and variables → Actions** に以下を登録：

| Secret 名 | 内容 |
|-----------|------|
| `FIREBASE_TOKEN` | `npx firebase-tools login:ci` で取得したトークン |
| `VITE_FIREBASE_API_KEY` | Firebase 設定値 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 設定値 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 設定値 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase 設定値 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase 設定値 |
| `VITE_FIREBASE_APP_ID` | Firebase 設定値 |

---

## ライセンス

MIT
