# Tasks: company-roles

## Task 1: Schema + Migration
- [x] 新增 `CompanyRole` model 到 `prisma/schema.prisma`
- [x] `User` model 新增 `companyRoles CompanyRole[]`
- [x] `ExternalDatabaseTable` 新增 `allowedRoles CompanyRole[]`
- [x] `ExternalDatabaseColumn` 新增 `allowedRoles CompanyRole[]`
- [x] 執行 `prisma db push`

## Task 2: CompanyRole API
- [x] `GET /api/admin/roles` — 列出所有角色（含使用者數量）
- [x] `POST /api/admin/roles` — 新增角色（名稱唯一驗證）
- [x] `PATCH /api/admin/roles/[id]` — 更新角色名稱
- [x] `DELETE /api/admin/roles/[id]` — 刪除角色（cascade 解除關聯）

## Task 3: 使用者角色指派 API
- [x] `PUT /api/admin/members/[id]/roles` — 設定使用者的角色清單（覆寫）

## Task 4: 更新 Table/Column API
- [x] 修改 `PATCH .../tables/[tableId]` 支援 `allowedRoleIds`
- [x] 修改 `PATCH .../columns/[columnId]` 支援 `allowedRoleIds`

## Task 5: 更新 Sync 邏輯
- [x] 修改 sync route，新 table/column 自動 connect 所有現有 CompanyRole

## Task 6: 角色管理頁面
- [x] 新增 `src/app/(admin)/admin/roles/page.tsx`（Server Component 列表）
- [x] 新增角色管理 Client Component（inline CRUD）
- [x] Sidebar 新增「角色管理」導覽項目

## Task 7: 使用者詳情頁角色指派
- [x] 修改 `src/app/(admin)/admin/members/[id]/page.tsx` 新增角色指派區塊

## Task 8: Schema Browser 角色勾選
- [x] 修改 `schema-browser.tsx` table/column 行加角色 badge + 勾選 dropdown
- [x] 更新 detail page 傳遞 allowedRoles 和全部角色資料給 SchemaBrowser
