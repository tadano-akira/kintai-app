# 勤怠管理システム

小規模・中規模組織向けのサーバーレス勤怠管理システム。Google アカウント認証を前提とし、Firebase 上で完結する構成を採用。

---

## システム構成

```
React + TypeScript (Vite)
  │
  ├── Firebase Authentication  ← Google Sign-In
  │
  ├── Cloud Firestore          ← 勤怠データ管理
  │
  ├── Cloud Functions          ← サーバーサイド処理（asia-northeast1）
  │     clockIn / clockOut / 申請承認 / 月次締め / CSV出力 等
  │
  └── Firebase Hosting         ← 本番環境配信
```

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React + TypeScript |
| UI ライブラリ | Material UI (MUI) |
| 認証 | Firebase Authentication（Google Sign-In） |
| データベース | Cloud Firestore |
| サーバーサイド | Cloud Functions for Firebase（Node.js 20） |
| ホスティング | Firebase Hosting |
| CI/CD | GitHub Actions |

## ユーザーロール

| ロール | 主な機能 |
|--------|---------|
| staff | 出退勤打刻・修正申請・休暇申請・自分の勤怠確認・有給残数確認 |
| admin | 全社員勤怠確認・申請承認・CSV出力・月次締め・有給付与管理 |

---

## ローカル開発環境の起動

```bash
npm install
npm run dev
```

`http://localhost:5173`（ポートが使用中の場合は 5174）でアクセス。

---

## Firebase セットアップ手順（初回）

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com) を開く
2. 「プロジェクトを追加」→ プロジェクト名を入力して作成
3. **Blaze プラン（従量課金）にアップグレード**（Cloud Functions の利用に必要）

### 2. Authentication の設定

1. 左サイドバー →「構築」→「Authentication」
2. 「始める」をクリック
3. 「Sign-in method」タブ →「新しいプロバイダを追加」→「Google」
4. トグルを「有効」にしてサポートメールを入力 →「保存」

### 3. Firestore Database の作成

1. 左サイドバー →「構築」→「Firestore Database」
2. 「データベースを作成」
3. ロケーション：`asia-northeast1`（東京）を選択
4. セキュリティルール：**「本番環境モード」** を選択して作成

### 4. ウェブアプリの登録と環境変数の設定

1. Firebase Console 左上のプロジェクト名 →「プロジェクトの設定」
2. 「マイアプリ」→「</>（ウェブ）」アイコン →「アプリを登録」
3. 表示される `firebaseConfig` の値をコピー
4. プロジェクトルートに `.env.local` を作成して貼り付け：

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. `.firebaserc` の `YOUR_FIREBASE_PROJECT_ID` を実際のプロジェクト ID に変更

### 5. Firebase CLI でルールと Functions をデプロイ

```bash
# Firebase CLI にログイン
npx firebase login

# プロジェクトを紐付け
npx firebase use <プロジェクトID>

# Firestore Security Rules をデプロイ
npx firebase deploy --only firestore:rules

# Cloud Functions をデプロイ（functions/ のビルドが必要）
cd functions && npm install && npm run build && cd ..
npx firebase deploy --only functions
```

### 6. 管理者ユーザーの設定

初回ログイン後、Firestore Console で `users/{uid}` ドキュメントの `role` フィールドを `admin` に変更することで管理者権限を付与できる。

---

## GitHub Actions による自動デプロイ

`main` ブランチへの push で Firebase Hosting と Functions が自動デプロイされる。

GitHub リポジトリの Settings → Secrets に以下を登録：

| Secret 名 | 内容 |
|-----------|------|
| `VITE_FIREBASE_API_KEY` | Firebase 設定値 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 設定値 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 設定値 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase 設定値 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase 設定値 |
| `VITE_FIREBASE_APP_ID` | Firebase 設定値 |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase サービスアカウントの JSON |

`FIREBASE_SERVICE_ACCOUNT` は Firebase Console →「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でダウンロードした JSON の内容をそのまま貼り付ける。

---

## ディレクトリ構成

```
kintai-app/
├── .github/workflows/deploy.yml   # GitHub Actions
├── functions/
│   └── src/index.ts               # Cloud Functions（全 11 関数）
├── src/
│   ├── components/
│   │   ├── Layout.tsx             # AppBar + サイドバー
│   │   └── PrivateRoute.tsx       # 認証・ロールガード
│   ├── hooks/
│   │   └── useAuth.ts             # 認証状態管理
│   ├── lib/
│   │   ├── firebase.ts            # Firebase 初期化
│   │   └── functions.ts           # Callable Function ラッパー
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── staff/Dashboard.tsx
│   │   └── admin/Dashboard.tsx
│   └── types/index.ts             # 全データモデルの型定義
├── firestore.rules                # Firestore Security Rules
├── firestore.indexes.json
├── firebase.json
└── .env.example                   # 環境変数のテンプレート
```
