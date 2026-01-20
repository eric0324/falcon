# Phase 3: API Bridge

## Why

目前工具內的 `window.companyAPI` 是直接在 Sandbox 內注入的 mock 資料，無法連接真實的內部系統。為了讓工具能真正發揮價值（例如查詢資料庫、呼叫內部 API），需要建立安全的 API Bridge 機制，並支援多資料源與部門層級權限控制。

## What Changes

建立 Data Source Registry 架構，讓 Sandbox 內的工具能夠：
1. 查詢多個資料庫（Postgres、MySQL 等）
2. 呼叫內部 REST API
3. 部門層級權限控制（不同部門看不同資料表/欄位）
4. 所有呼叫都有審計日誌

### Scope

| Area | Change Type | Description |
|------|-------------|-------------|
| Database | Add | DataSource、DataSourcePermission、ApiLog models |
| Database | Modify | Tool 新增 allowedSources 欄位 |
| Scripts | Add | 資料源管理腳本 `scripts/datasource.ts` |
| Sandbox | Replace | Mock API → postMessage bridge client |
| Frontend | Add | API Bridge handler (parent frame) |
| Backend | Add | /api/bridge 動態路由 |
| Studio | Add | 資料源權限選擇器 |
| System Prompt | Update | 動態生成可用資料源與 schema |

### Out of Scope

- Admin 後台 UI（用 CLI 腳本管理）
- INSERT/UPDATE/DELETE 操作（Schema 先開，Phase 4 實作）
- OAuth token 流程（假設已有 session）
- Rate limiting（未來）

### Future Considerations

Schema 預留寫入權限欄位，Phase 4 可擴充：
- `writeTables` - 可 INSERT/UPDATE 的表
- `deleteTables` - 可 DELETE 的表（需審批流程）
