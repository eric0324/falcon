# Tasks: 後台對話管理列表

## Task 1: 列表頁

- [x] `src/app/(admin)/admin/conversations/page.tsx`
  - [x] searchParams: `page`, `q`, `starred`, `userId`, `model`, `deleted`
  - [x] Prisma where：q AND filter AND（預設不過濾 deletedAt）
  - [x] 取分頁 20 筆 conversations + count
  - [x] 計算 token / cost：用對話 id 集合 query TokenUsage 後聚合
  - [x] 取 deploy 過的 Tool（`tool` relation select）
  - [x] 取 user dropdown 用 list + model dropdown 用 distinct
  - [x] SearchInput + ConversationFilters + 表格 + Pagination

## Task 2: Filter 元件

- [x] `src/app/(admin)/admin/conversations/conversation-filters.tsx`
  - [x] 4 個 select：starred 三態、user dropdown、model dropdown、deleted 三態
  - [x] 模仿 logs/log-filters.tsx 模式

## Task 3: Viewer 頁

- [x] `src/app/(admin)/admin/conversations/[id]/page.tsx`
  - [x] 取單一 conversation 含 messages、user、tool
  - [x] 計算 token / cost
  - [x] header meta + 訊息渲染
  - [x] 找不到回 404

## Task 4: Message 渲染

- [x] `src/app/(admin)/admin/conversations/message-list.tsx`
  - [x] 簡化版：role + content + 時間 + token 用量
  - [x] tool call 顯示為紀錄一行
  - [x] 附件顯示為檔名 chip
  - [x] content 是 string 或 array of parts 都要能處理

## Task 5: Sidebar 連結

- [x] `src/app/(admin)/admin/admin-sidebar.tsx` navItems 加對話管理

## Task 6: 收尾

- [x] `npx tsc --noEmit`、`npx vitest run` 全綠
- [x] 手動測試列表頁搜尋、4 個 filter、進 viewer 看訊息
- [x] changelog 加一筆 patch
- [x] `openspec archive add-admin-conversations --yes`

## 依賴關係

```
Task 2 ← Task 1
Task 4 ← Task 3
Task 1 / 3 / 5 ← Task 6
```

Task 1、3 平行；2、4 是各自子元件；5 獨立。
