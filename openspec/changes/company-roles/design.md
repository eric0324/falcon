# Design: company-roles

## Architecture

### 資料模型

```prisma
model CompanyRole {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())

  users   User[]
  tables  ExternalDatabaseTable[]
  columns ExternalDatabaseColumn[]
}
```

- `User` 新增 `companyRoles CompanyRole[]`（Prisma implicit many-to-many）
- `ExternalDatabaseTable` 新增 `allowedRoles CompanyRole[]`
- `ExternalDatabaseColumn` 新增 `allowedRoles CompanyRole[]`

Prisma 會自動建立 `_CompanyRoleToUser`、`_CompanyRoleToExternalDatabaseTable`、`_CompanyRoleToExternalDatabaseColumn` 三張中間表。

### API 結構

```
src/app/api/admin/
├── roles/
│   ├── route.ts                    # GET: 列表, POST: 新增
│   └── [id]/
│       └── route.ts                # PATCH: 更新, DELETE: 刪除
├── members/
│   └── [id]/
│       └── roles/
│           └── route.ts            # PUT: 設定使用者的角色清單
└── databases/
    └── [id]/
        └── tables/
            └── [tableId]/
                ├── route.ts        # PATCH: 更新 note/hidden/allowedRoles
                └── columns/
                    └── [columnId]/
                        └── route.ts # PATCH: 更新 note/allowedRoles
```

### 頁面結構

```
src/app/(admin)/admin/
├── roles/
│   └── page.tsx                    # 角色管理頁（列表 + inline 新增/編輯/刪除）
├── members/
│   └── [id]/
│       └── page.tsx                # 修改：新增角色指派區塊
└── databases/
    └── [id]/
        └── schema-browser.tsx      # 修改：table/column 行加角色勾選
```

### 角色管理頁 UI

簡單的列表頁面，支援 inline 操作：
- 顯示所有角色名稱 + 使用者數量
- 「新增角色」按鈕 → inline input 或 dialog
- 每行有編輯（rename）和刪除按鈕
- 刪除時確認 dialog

### 使用者詳情頁角色指派

在現有使用者詳情頁新增一個區塊：
- 顯示所有可用角色，每個一個 checkbox
- 勾選/取消勾選即時 PUT 更新

### Schema Browser 角色勾選

在 table/column 行新增角色 badge 和編輯功能：
- 顯示當前 allowedRoles 作為 badge
- 點擊展開角色勾選 dropdown
- 全選 = 所有角色可見，全不選 = 所有角色可見（與全選等效）

### Sync 策略

掃描時新 table/column 的 allowedRoles：
- 查詢所有現有 `CompanyRole`
- 新建的 table/column connect 到所有現有角色
- 已存在的 table/column 保留原本的 allowedRoles

## Trade-offs

1. **Implicit vs Explicit many-to-many**
   - 選擇：Implicit（Prisma 自動管理中間表）
   - 原因：不需要在中間表存額外資料，implicit 寫法簡潔

2. **department 欄位處理**
   - 選擇：暫時保留，不做自動遷移
   - 原因：避免破壞現有功能，管理員手動建立角色後自行遷移

3. **無角色使用者的預設行為**
   - 選擇：無角色 = 無權限（全部不可見）
   - 原因：安全優先，避免未指派角色的使用者意外看到敏感資料
