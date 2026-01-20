# Falcon - Vibe Coding Platform

內部工具產生平台，使用 AI 協助員工快速建立內部工具。

## 技術棧

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js (Google OAuth)
- **AI**: Claude API (Anthropic)
- **Sandbox**: Sandpack (CodeSandbox)
- **Runtime**: Bun

## 快速開始

### 環境需求

- Docker & Docker Compose
- Bun (選用，本地開發)

### 1. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env` 填入以下資訊：

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
ALLOWED_EMAIL_DOMAIN=your_company.com
```

### 2. 啟動 Docker

```bash
docker compose up --build -d
```

### 3. 訪問網站

打開 http://localhost:3000

## API Bridge 功能

API Bridge 讓工具可以安全地查詢公司內部資料庫和 API。

### 測試 MySQL 資料源

專案包含一個測試用的 MySQL 資料庫（鯨魚購物），內含假資料。

#### 1. 啟動 Docker（含 MySQL）

```bash
docker compose up --build -d
```

#### 2. 等待 MySQL 就緒

```bash
docker compose logs -f mysql_test
```

看到 `ready for connections` 後按 `Ctrl+C`

#### 3. 進入 app 容器設定資料源

```bash
docker compose exec app sh
```

#### 4. 新增資料源

```bash
bun scripts/datasource.ts add \
  --name db_main \
  --display-name "鯨魚購物資料庫" \
  --type mysql \
  --host mysql_test \
  --port 3306 \
  --database whale_shop \
  --user readonly \
  --password readonly123 \
  --global-blocked-columns password,personal_id,cost
```

#### 5. 同步 Schema

讓 Claude 知道有哪些表格和欄位：

```bash
bun scripts/datasource.ts sync-schema db_main
```

#### 6. 設定部門權限

```bash
# 預設權限（所有部門）
bun scripts/datasource.ts add-permission \
  --source db_main \
  --department "*" \
  --read-tables users,orders,products,order_items

# 客服部門（隱藏 phone）
bun scripts/datasource.ts add-permission \
  --source db_main \
  --department "客服" \
  --read-tables users,orders,products,order_items \
  --read-blocked-columns phone

# 財務部門（可看薪資）
bun scripts/datasource.ts add-permission \
  --source db_main \
  --department "財務" \
  --read-tables users,orders,products,order_items,salaries,expenses
```

#### 7. 查看設定

```bash
bun scripts/datasource.ts show db_main
```

### 測試工具

1. 打開 http://localhost:3000/studio
2. 登入後輸入提示：「幫我做一個訂單列表，顯示最近 10 筆訂單」
3. Deploy 時勾選 `db_main` 資料源
4. 執行工具查看結果

### CLI 指令參考

```bash
# 列出所有資料源
bun scripts/datasource.ts list

# 新增資料源
bun scripts/datasource.ts add --name <name> --type <postgres|mysql|rest_api> ...

# 同步資料庫結構
bun scripts/datasource.ts sync-schema <name>

# 新增權限
bun scripts/datasource.ts add-permission --source <name> --department <dept> --read-tables <tables>

# 查看資料源詳情
bun scripts/datasource.ts show <name>

# 列出權限
bun scripts/datasource.ts list-permissions <name>

# 停用/啟用資料源
bun scripts/datasource.ts disable <name>
bun scripts/datasource.ts enable <name>

# 移除資料源
bun scripts/datasource.ts remove <name>
```

### 測試資料表

鯨魚購物資料庫包含以下表格：

| 表格 | 說明 |
|------|------|
| users | 使用者（含 phone, email） |
| products | 商品（含 cost 成本） |
| orders | 訂單 |
| order_items | 訂單明細 |
| salaries | 薪資（敏感） |
| expenses | 費用報銷 |

### 權限範例

| 部門 | 可查表格 | 被過濾欄位 |
|------|---------|-----------|
| 客服 | users, orders, products | phone |
| 行銷 | users, orders, products | phone, email |
| 財務 | 全部含 salaries | 無 |
| 其他 | 只有 products | - |

## 本地開發

```bash
# 安裝 bun
curl -fsSL https://bun.sh/install | bash

# 安裝依賴
bun install

# 啟動開發伺服器
bun run dev
```

## 專案結構

```
falcon/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   ├── studio/       # 工具建立頁面
│   │   ├── tool/         # 工具執行頁面
│   │   └── marketplace/  # 工具市集
│   ├── components/       # React 元件
│   ├── lib/              # 工具函式
│   │   ├── connectors/   # 資料庫連接器
│   │   └── permissions.ts # 權限邏輯
│   └── hooks/            # React Hooks
├── scripts/
│   ├── datasource.ts     # 資料源管理 CLI
│   └── init-mysql.sql    # MySQL 測試資料
├── prisma/
│   └── schema.prisma     # 資料庫 Schema
└── docker-compose.yml
```
