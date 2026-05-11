# Tasks: 後台列表頁加文字搜尋

## Task 1: 共用 SearchInput 元件

- [x] `src/app/(admin)/admin/search-input.tsx`
  - [x] client component
  - [x] 受控 input、initialValue 從 props
  - [x] 300ms debounce 後呼 router.push
  - [x] basePath、extraParams（保留其他 searchParam）由 props 傳入
  - [x] 搜尋送出時 reset page=1（不加 page）
  - [x] 空字串時不要帶 `q=` 鍵
- [x] 跑型別檢查通過

## Task 2: databases 列表

- [x] page.tsx searchParams 加 `q`
- [x] Prisma where：`name: { contains: q, mode: "insensitive" }`
- [x] basePath 帶 q
- [x] 頁面頂部插入 SearchInput

## Task 3: tools 列表

- [x] page.tsx searchParams 加 `q`
- [x] Prisma where：`OR: [{ name }, { author: { name } }, { author: { email } }]` 全部 contains insensitive
- [x] basePath 帶 q
- [x] SearchInput 插入

## Task 4: members 列表

- [x] page.tsx searchParams 加 `q`
- [x] Prisma where：`OR: [{ name }, { email }]`
- [x] basePath 帶 q
- [x] SearchInput 插入

## Task 5: scans 列表

- [x] page.tsx searchParams 加 `q`
- [x] where 與 status filter AND 組合：`AND: [statusWhere, { OR: [tool.name, tool.author.name, tool.author.email] }]`
- [x] basePath 帶 q + 既有 status
- [x] SearchInput 與 ScanList 既有 status filter 並列

## Task 6: logs 列表

- [x] page.tsx searchParams 加 `q`
- [x] where 與既有多個 filter AND 組合
- [x] 搜尋對應欄位：tool.name 與 errorMessage（先確認 DataSourceLog schema 有哪些文字欄）
- [x] basePath 帶 q + 既有 4 個 filter
- [x] SearchInput 與 LogFilters 並列

## Task 7: groups 列表

- [x] 看 group-manager 結構決定 server-side 還是 client-side filter
- [x] 若 group-manager 是純 client 取全表，可加 client-side filter（保留例外）
- [x] 若有 server-side query，加 q searchParam

## Task 8: 收尾

- [x] `npx tsc --noEmit` 全綠
- [x] `npx vitest run` 全綠
- [x] 手動測試：每頁打字搜尋、清空、翻頁、與既有 filter 組合
- [x] changelog 加一筆 patch（後台 UX 改善）
- [x] `openspec archive add-admin-search --yes`

## 依賴關係

```
Task 1 ← Task 2 ← Task 8
       ← Task 3
       ← Task 4
       ← Task 5
       ← Task 6
       ← Task 7
```

Task 1 是共用元件先做；2-7 可平行。
