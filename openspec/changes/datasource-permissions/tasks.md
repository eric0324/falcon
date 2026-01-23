# Tasks: 資料來源權限控管 - 預設唯讀

## 1. SQL 操作類型判斷
- [ ] 1.1 實作 SQL parser 判斷操作類型：
  ```typescript
  type SqlOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';

  function parseSqlOperation(sql: string): SqlOperation {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
  ```
- [ ] 1.2 處理 CTE (WITH ... SELECT) 的情況
- [ ] 1.3 處理多語句的情況 (禁止或只取第一個)

## 2. 權限 Model 設計
- [ ] 2.1 建立 DataSourcePermission model：
  ```prisma
  model DataSourcePermission {
    id           String   @id @default(cuid())
    toolId       String
    dataSourceId String
    canInsert    Boolean  @default(false)
    canUpdate    Boolean  @default(false)
    canDelete    Boolean  @default(false)
    grantedBy    String?  // 授權者 userId
    grantedAt    DateTime?
    createdAt    DateTime @default(now())

    tool       Tool       @relation(...)
    dataSource DataSource @relation(...)

    @@unique([toolId, dataSourceId])
  }
  ```
- [ ] 2.2 執行 migration

## 3. API Bridge 權限檢查
- [ ] 3.1 在 /api/bridge 加入權限檢查：
  ```typescript
  const operation = parseSqlOperation(sql);

  if (operation !== 'SELECT') {
    const permission = await prisma.dataSourcePermission.findUnique({
      where: { toolId_dataSourceId: { toolId, dataSourceId } }
    });

    if (operation === 'INSERT' && !permission?.canInsert) {
      return { error: '此工具沒有 INSERT 權限' };
    }
    // ... UPDATE, DELETE 同理
  }
  ```
- [ ] 3.2 OTHER 類型一律禁止 (DROP, ALTER, TRUNCATE 等)
- [ ] 3.3 記錄被攔截的操作 (logging)

## 4. 錯誤處理
- [ ] 4.1 定義權限錯誤回應格式：
  ```typescript
  {
    error: 'PERMISSION_DENIED',
    message: '此工具沒有對 [資料來源名稱] 執行 INSERT 的權限',
    operation: 'INSERT',
    dataSource: 'xxx'
  }
  ```
- [ ] 4.2 前端顯示友善的錯誤訊息

## 5. 預設權限邏輯
- [ ] 5.1 無 DataSourcePermission 記錄 = 只有 SELECT
- [ ] 5.2 Tool 首次使用資料來源時自動建立唯讀權限記錄 (可選)
