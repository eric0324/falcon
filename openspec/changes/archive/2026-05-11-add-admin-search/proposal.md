# Proposal: 後台所有列表頁加文字搜尋

## 概述

`/admin` 下 6 個列表頁（databases、tools、members、scans、logs、groups）統一新增文字搜尋輸入框，與既有分頁 / filter 並存。搜尋走 URL searchParam + Prisma server-side WHERE 查詢，跟現有 logs / scans filter 模式一致。

## 動機

- 目前只有 logs / scans 有下拉 filter，沒有任何頁面能用關鍵字搜
- 資料量起來後（tools 上百個、members 數十人、logs 數千筆）只靠分頁翻找不切實際
- 工程師管後台時最常見的訴求就是「找 OO 寫的工具」「找 XX 這個帳號」「看 db 連線出問題的某筆 log」

## 目標

1. 6 個列表頁都加 `q` searchParam，UI 是頂部單一輸入框 + debounce 觸發 router push
2. 每頁搜尋對應欄位：
   - **databases**：`name`
   - **tools**：`name` + 作者 `name` / `email`
   - **members**：`name` + `email`
   - **scans**：關聯 `tool.name` + 作者 `name` / `email`
   - **logs**：關聯 `tool.name` + `errorMessage` 文字 contains（若有該欄位）
   - **groups**：群組 `name`
3. 搜尋與既有 filter 可同時生效（用 AND 組合）
4. 搜尋時自動 reset 到第 1 頁
5. 搜尋為空字串時等同沒帶 `q`

## 非目標

- 不做全文索引（用 Prisma `contains` `mode: insensitive` 即可，PG 內建 LIKE / ILIKE）
- 不做多欄位獨立輸入（一個搜尋框跨多欄 OR 比較）
- 不做歷史搜尋紀錄、建議詞
- 不做 client-side filter；統一走 server-side，跟分頁邏輯一致

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/app/(admin)/admin/search-input.tsx` | 共用 client component：受控 input + 300ms debounce + router push 帶 `q` |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/(admin)/admin/databases/page.tsx` | searchParams 加 `q`、Prisma where 加 name OR |
| `src/app/(admin)/admin/tools/page.tsx` | searchParams 加 `q`、Prisma where 加 name / author OR |
| `src/app/(admin)/admin/members/page.tsx` | searchParams 加 `q`、Prisma where 加 name / email OR |
| `src/app/(admin)/admin/scans/page.tsx` | searchParams 加 `q`、where 加 tool.name / author OR |
| `src/app/(admin)/admin/logs/page.tsx` | searchParams 加 `q`、where 加 tool.name / errorMessage OR |
| `src/app/(admin)/admin/groups/page.tsx` 或 `group-manager.tsx` | 加搜尋輸入（groups 結構需再看） |
| 各頁的 Pagination basePath | 帶上 `q` 確保翻頁不掉搜尋 |
| `src/app/(admin)/admin/scans/scan-list.tsx`、`logs/log-filters.tsx` | 與新 SearchInput 並列佈局 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 大表 LIKE 全表掃描慢 | 第一版接受；之後若慢可加 PG `pg_trgm` / 全文索引（另案） |
| 跨關聯欄位搜尋（tools 找作者）SQL plan 可能變大 | 用 `OR` + `is` 關聯子查詢，PG planner 對小到中表足夠 |
| 搜尋空字串 vs 沒帶 `q` 行為不一致 | 在 page.tsx 統一用 `(params.q ?? "").trim()`，空字串時當沒帶 |
| 搜尋同時翻頁，basePath 沒帶 q 會掉條件 | basePath 用 URLSearchParams 統一組裝 |
| client component 與既有 LogFilters 排版打架 | 用 flex-wrap，SearchInput 放最左、filter 在右 |

## 驗收標準

1. 6 個列表頁頂部都看得到搜尋輸入框
2. 在 databases 搜「測試」→ 只剩名字含「測試」的 DB
3. tools 搜「andy@」→ 列出作者 email 含 andy@ 的工具
4. members 搜「老王」→ 名字或 email 含老王者全列出
5. scans 與 logs 搜尋與既有 filter 可同時生效
6. 帶 `q` 搜尋後分頁翻頁，`q` 仍保留在 URL
7. 清空輸入框 → 等同回到無搜尋狀態
