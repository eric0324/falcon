# API Bridge Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                          │
│  ┌──────────────────────┐    ┌─────────────────────────────────┐│
│  │ Parent Frame         │    │ Sandbox (Sandpack iframe)       ││
│  │                      │    │                                 ││
│  │  ┌────────────────┐  │    │  ┌─────────────────────────┐   ││
│  │  │ useApiBridge   │◄─┼────┼──│ window.companyAPI       │   ││
│  │  │ (message       │  │    │  │   .query(source, sql)   │   ││
│  │  │  handler)      │──┼────┼─►│   .call(source, method) │   ││
│  │  └───────┬────────┘  │    │  └─────────────────────────┘   ││
│  │          │           │    │                                 ││
│  └──────────┼───────────┘    └─────────────────────────────────┘│
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │ fetch
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/bridge                                               │   │
│  │  1. Validate session                                      │   │
│  │  2. Check tool.allowedSources                             │   │
│  │  3. Load DataSource + user's department permission        │   │
│  │  4. Validate table access                                 │   │
│  │  5. Execute query, filter blocked columns                 │   │
│  │  6. Log to ApiLog                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ db_main      │ │ db_analytics │ │ hr_api       │            │
│  │ (Postgres)   │ │ (MySQL)      │ │ (REST)       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```prisma
enum DataSourceType {
  POSTGRES
  MYSQL
  REST_API
}

model DataSource {
  id                   String         @id @default(cuid())
  name                 String         @unique  // "db_main", "hr_api"
  displayName          String                  // "主資料庫", "HR 系統"
  description          String?                 // "公司主要營運資料"
  type                 DataSourceType

  // Connection config (encrypted in production)
  config               Json           // { host, port, database, user, password } or { baseUrl, headers }

  // Global restrictions (apply to ALL departments)
  globalBlockedColumns String[]       @default([])  // ["password", "token", "cost"]

  // REST API specific
  allowedEndpoints     String[]       @default([])  // For REST: ["getEmployees", "getDepartments"]

  // Metadata for System Prompt
  schema               Json?          // Table schemas for Claude context

  isActive             Boolean        @default(true)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  permissions          DataSourcePermission[]
  apiLogs              ApiLog[]
}

model DataSourcePermission {
  id              String   @id @default(cuid())
  dataSourceId    String
  department      String   // "HR", "Finance", "*" (default)

  // Read permissions (Phase 3)
  readTables         String[]   @default([])  // Tables allowed for SELECT
  readBlockedColumns String[]   @default([])  // Columns to filter on read

  // Write permissions (Phase 4 - schema ready, not implemented)
  writeTables        String[]   @default([])  // Tables allowed for INSERT/UPDATE
  writeBlockedColumns String[]  @default([])  // Columns blocked on write
  deleteTables       String[]   @default([])  // Tables allowed for DELETE

  dataSource      DataSource @relation(fields: [dataSourceId], references: [id], onDelete: Cascade)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([dataSourceId, department])
  @@index([department])
}

model ApiLog {
  id           String     @id @default(cuid())
  dataSourceId String
  toolId       String?
  userId       String
  department   String     // User's department at time of query

  operation    String     // "query" or "call"
  method       String?    // For REST: endpoint name
  query        String?    // For DB: SQL query (sanitized)
  params       Json?      // Query parameters

  success      Boolean
  errorMessage String?
  rowCount     Int?       // For DB queries
  duration     Int        // milliseconds

  createdAt    DateTime   @default(now())

  dataSource   DataSource @relation(fields: [dataSourceId], references: [id])
  tool         Tool?      @relation(fields: [toolId], references: [id], onDelete: SetNull)
  user         User       @relation(fields: [userId], references: [id])

  @@index([dataSourceId])
  @@index([toolId])
  @@index([userId])
  @@index([department])
  @@index([createdAt])
}

model Tool {
  // ... existing fields
  allowedSources  String[]  @default([])  // ["db_main", "hr_api"]
  apiLogs         ApiLog[]
}

model User {
  // ... existing fields
  apiLogs         ApiLog[]
}
```

## Permission Resolution Flow

```
User (department: "客服") queries "SELECT * FROM orders"

1. Check tool.allowedSources includes "db_main" ✓
2. Load DataSourcePermission where dataSourceId="db_main" AND department="客服"
   - If not found, try department="*" (default)
   - If still not found, reject
3. Check "orders" in permission.readTables ✓
4. Execute query
5. Filter out:
   - DataSource.globalBlockedColumns (e.g., "password")
   - Permission.readBlockedColumns (e.g., "phone")
6. Return filtered results
7. Log to ApiLog
```

## CLI Script Usage

```bash
# ===== Data Source Management =====

# List all data sources
npx tsx scripts/datasource.ts list

# Add Postgres data source
npx tsx scripts/datasource.ts add \
  --name db_main \
  --display-name "主資料庫" \
  --type postgres \
  --host localhost \
  --port 5432 \
  --database myapp \
  --user readonly \
  --password secret123 \
  --global-blocked-columns password,token,cost

# Add REST API data source
npx tsx scripts/datasource.ts add \
  --name hr_api \
  --display-name "HR 系統" \
  --type rest_api \
  --base-url https://hr.internal.company.com/api \
  --header "Authorization: Bearer xxx" \
  --endpoints getEmployees,getDepartments,getLeaveBalance

# Sync schema (introspect DB tables for Claude context)
npx tsx scripts/datasource.ts sync-schema db_main

# Disable/Enable data source
npx tsx scripts/datasource.ts disable db_main
npx tsx scripts/datasource.ts enable db_main

# ===== Permission Management =====

# Add department permission
npx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department 客服 \
  --read-tables users,orders,products \
  --read-blocked-columns phone

# Add default permission (for departments not explicitly configured)
npx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department "*" \
  --read-tables products

# Update permission
npx tsx scripts/datasource.ts update-permission \
  --source db_main \
  --department 客服 \
  --add-read-tables returns \
  --remove-read-tables products

# List permissions for a data source
npx tsx scripts/datasource.ts list-permissions db_main

# Remove permission
npx tsx scripts/datasource.ts remove-permission db_main 客服
```

## Example: 電商公司「鯨魚購物」

### Data Source Setup

```bash
# 1. Create data source
npx tsx scripts/datasource.ts add \
  --name db_main \
  --display-name "主資料庫" \
  --type postgres \
  --host db.whale.internal \
  --database whale_shop \
  --user readonly \
  --password xxx \
  --global-blocked-columns password,personal_id,cost

# 2. Sync schema
npx tsx scripts/datasource.ts sync-schema db_main

# 3. Set department permissions
npx tsx scripts/datasource.ts add-permission \
  --source db_main --department 客服 \
  --read-tables users,orders,products \
  --read-blocked-columns phone

npx tsx scripts/datasource.ts add-permission \
  --source db_main --department 財務 \
  --read-tables orders,expenses,salaries,employees

npx tsx scripts/datasource.ts add-permission \
  --source db_main --department 行銷 \
  --read-tables users,orders,products \
  --read-blocked-columns phone,email

npx tsx scripts/datasource.ts add-permission \
  --source db_main --department "*" \
  --read-tables products
```

### Usage Scenarios

| User | Department | Query | Result |
|------|------------|-------|--------|
| 小美 | 客服 | `SELECT * FROM orders` | ✅ Success |
| 小美 | 客服 | `SELECT * FROM salaries` | ❌ "Table not allowed" |
| 阿明 | 行銷 | `SELECT email FROM users` | ✅ Success, but `email` filtered out |
| 財務經理 | 財務 | `SELECT * FROM salaries` | ✅ Full access |
| 工程師 | 工程 | `SELECT * FROM products` | ✅ Success (uses "*" default) |
| 工程師 | 工程 | `SELECT * FROM users` | ❌ "Table not allowed" |

## Sandbox API Client

```javascript
// Injected into Sandbox
window.companyAPI = {
  // Query database (Phase 3)
  query: (source, sql, params = []) => {
    return bridgeCall('query', { source, sql, params });
  },

  // Call REST API (Phase 3)
  call: (source, endpoint, data = {}) => {
    return bridgeCall('call', { source, endpoint, data });
  },

  // Get available sources for current user
  getSources: () => {
    return bridgeCall('getSources', {});
  },

  // Execute write operations (Phase 4 - not implemented yet)
  // execute: (source, sql, params = []) => { ... },
  // insert: (source, table, data) => { ... },
  // update: (source, table, data, where) => { ... },
};

function bridgeCall(operation, payload) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => {
      reject(new Error('API call timeout (30s)'));
    }, 30000);

    window.addEventListener('message', function handler(e) {
      if (e.data?.type === 'api-bridge-response' && e.data.id === id) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    });

    parent.postMessage({
      type: 'api-bridge',
      id,
      operation,
      ...payload
    }, '*');
  });
}
```

## System Prompt Generation

動態生成給 Claude 的 context（根據使用者部門過濾）：

```
## 可用資料源

### db_main (主資料庫)
類型: PostgreSQL

可查詢資料表（根據您的部門權限）:
- users: id, name, created_at (email, phone 不可存取)
- orders: id, user_id, total, status, created_at
- products: id, name, price, stock

使用方式:
const data = await companyAPI.query('db_main',
  'SELECT * FROM orders WHERE status = ?',
  ['pending']
);

注意：
- 只能使用 SELECT 查詢
- 某些欄位會根據權限自動過濾
```

## Security Layers

| Layer | Check |
|-------|-------|
| Sandbox | postMessage isolation |
| Parent Frame | Validate message format |
| Backend | Session authentication |
| Backend | tool.allowedSources check |
| Backend | Department permission lookup |
| Backend | Table whitelist validation |
| Connector | Column filtering (global + department) |
| Connector | Prepared statements (SQL injection prevention) |
| Connector | Query timeout (5s default) |
| Audit | Log all operations to ApiLog |
