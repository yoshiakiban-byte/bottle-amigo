# Bottle Amigo デプロイ手順（Render）

## 概要

BFFサーバー1つで API + 静的ファイル（Consumer / Store）を配信します。

| URL | 内容 |
|------|------|
| `https://your-app.onrender.com/` | ユーザー側アプリ |
| `https://your-app.onrender.com/staff/` | 店舗側アプリ |
| `https://your-app.onrender.com/auth/...` | API |

---

## 手順

### 1. GitHubリポジトリを作成

```bash
cd bottle-amigo
git init
git add .
git commit -m "Initial commit"
```

GitHubで新しいリポジトリを作成し、pushします：

```bash
git remote add origin https://github.com/<あなたのユーザー名>/bottle-amigo.git
git branch -M main
git push -u origin main
```

### 2. Renderでデプロイ

1. [Render](https://render.com) にアクセスしてアカウント作成（GitHub連携推奨）
2. **Dashboard → New → Web Service**
3. GitHubリポジトリ `bottle-amigo` を選択
4. 設定：
   - **Name**: `bottle-amigo`（好きな名前）
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
   - **Environment Variables**: 特に不要（PORTはRenderが自動設定）
5. **Create Web Service** をクリック

### 3. デプロイ完了

数分でデプロイが完了します。URLは：
- `https://bottle-amigo.onrender.com/` （ユーザー側）
- `https://bottle-amigo.onrender.com/staff/` （店舗側）

---

## 注意事項

### データの永続性
- Renderの無料プランでは、デプロイのたびにファイルシステムがリセットされます
- SQLiteデータベースもリセットされますが、**シードデータが自動投入**されるので、デモ用途には問題ありません
- 本番運用する場合は、外部DBサービス（例：Supabase、PlanetScale）への移行を検討してください

### 無料プランの制限
- 15分間アクセスがないとスリープ状態になります（次のアクセスで30秒ほど起動に時間がかかります）
- 月750時間の稼働制限があります

### ローカル開発
ローカルでは従来通り `./start.sh` で3サーバー構成で動きます。
統合サーバーで試したい場合は：

```bash
cd bottle-amigo
python3 bff/server.py
# → http://localhost:3001/       (ユーザー側)
# → http://localhost:3001/staff/  (店舗側)
```

---

## デモアカウント

| 役割 | ログイン情報 |
|------|------------|
| ユーザー | tanaka@example.com / password123 |
| ユーザー | suzuki@example.com / password123 |
| ユーザー | sato@example.com / password123 |
| 店舗スタッフ（ママ） | PIN: 1234 |
| 店舗スタッフ（バーテンダー） | PIN: 5678 |
