# Proposal: 後台對話管理列表

## 概述

新增 admin 區 `/admin/conversations` 列表頁與 `/admin/conversations/[id]` viewer 頁，讓 admin 可以跨使用者瀏覽、搜尋、篩選所有對話，並點進去 read-only 看完整訊息內容。沿用既有 SearchInput 共用元件與分頁慣例。

## 動機

- 目前 admin 只能從 `/admin/members/[id]` 進去看單一成員的對話，沒有跨平台檢視
- 出 bug、客訴、稽核時要找「某模型用得最兇的對話」「某月所有錯誤回應的對話」「某段時間 starred 的對話」很麻煩
- 沿用剛做完的 admin-search 模式，UI 一致

## 目標

1. `/admin/conversations` 列表：
   - 預設依 `updatedAt` desc，分頁 20 筆
   - 欄位：標題 + starred icon、使用者（avatar + name + email）、模型、訊息數、Token 用量、預估費用、是否演變為 Tool、最後活躍、刪除狀態 badge
   - 搜尋：標題 + 使用者 name / email（沿用 SearchInput）
   - Filter：starred（三態）、使用者 dropdown、模型 dropdown、軟刪除狀態（雖然預設一律顯示，但仍可只看正常 / 只看已刪除）
   - 已刪除的對話加 badge 區隔但仍顯示
2. `/admin/conversations/[id]` viewer：
   - read-only 顯示完整訊息（含 user / assistant、tool calls、附件 meta）
   - header 顯示 meta：使用者、模型、建立時間、訊息數、token、cost、deploy 連結（若有 Tool）
   - 不可編輯、不可送訊息、不可刪除
3. `AdminSidebar` 加「對話管理」連結（Icon: MessageSquare），位置在「使用者管理」與「工具管理」之間

## 非目標

- 不做匯出 CSV / JSON
- 不做 admin 刪除對話（DELETE API 未做）
- 不做訊息級全文搜尋（搜尋只在 title + user）
- 不做 token / cost 範圍 filter（之後若需要可加）
- 不做日期區間 filter（同上）
- viewer 不重用 ChatMessage 元件如果太麻煩，可用簡化版（純 markdown / 純文字）

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/app/(admin)/admin/conversations/page.tsx` | 列表頁 server component |
| `src/app/(admin)/admin/conversations/[id]/page.tsx` | viewer server component |
| `src/app/(admin)/admin/conversations/conversation-filters.tsx` | client component：starred / user / model / deleted 4 個 dropdown |
| `src/app/(admin)/admin/conversations/message-list.tsx` | viewer 內訊息渲染（簡化版，user/assistant/tool） |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/(admin)/admin/admin-sidebar.tsx` | 加 `{ href: "/admin/conversations", label: "對話管理", icon: MessageSquare }` |
| `src/lib/changelog.ts` | 加一筆 patch 條目 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 全平台對話查詢效能 | 已有 index on `userId, updatedAt`；要再加跨使用者 sorting 可能需要更廣的 index，先觀察 |
| viewer 顯示完整訊息可能含敏感資料 | admin 是 trusted role，本來就能存取；UI 不額外加遮罩 |
| token / cost 計算每筆都 group-by 太慢 | 沿用 `/admin/members/[id]/conversations` 的算法（先取對話再聚合 tokenUsages），但限定分頁內的 conversationId list，避免全表 group |
| Tool 演變連結需 LEFT JOIN | Prisma `conversation.tool` 已有 1:1 relation，select 即可 |

## 驗收標準

1. `/admin/conversations` 列表顯示分頁 20 筆，按 updatedAt desc
2. 列表能看到每筆對話的標題、使用者、模型、訊息數、token、cost、starred icon、deploy 連結、刪除 badge
3. 搜尋輸入「測試」→ 只剩標題含「測試」或使用者 name / email 含「測試」者
4. starred filter 切到「只看星標」→ 只剩 `starred = true`
5. 使用者 filter 選某成員 → 只剩該成員的對話
6. 模型 filter 選 `claude-opus-47` → 只剩該模型對話
7. 軟刪除 filter「只看已刪除」→ 只剩 `deletedAt IS NOT NULL`
8. 多 filter 與搜尋可同時生效（AND）
9. 點對話標題 → 進 `/admin/conversations/[id]` viewer
10. viewer 顯示完整訊息含 user / assistant / tool call，header 顯示 meta
11. AdminSidebar 看得到「對話管理」連結
