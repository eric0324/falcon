# Proposal: 知識庫頁面 server-side 權限守門

## 概述

`src/app/(app)/knowledge/[id]/page.tsx` 與 `src/app/(app)/knowledge/[id]/settings/page.tsx` 兩個 server page 目前只檢查 session（是否登入），**沒有檢查使用者對該知識庫是否有適當的存取權**。實際擋下未授權存取靠的是：client mount 後 fetch detail API 拿到 404、再在 catch block 做 `router.push('/knowledge')`。

這是「依賴 client redirect 做安全擋拒」，不是真的 server-side guard。改動細節微小但意義重要：在 server page 直接呼叫 `getKnowledgeBaseRole`，沒權限就 `notFound()` / `redirect()`。

## 動機

- API 層權限檢查雖然完整，但 server page 沒守門，依賴 client redirect 等於把擋拒邏輯放到不可信邊界
- 任何 client 端 race condition、loading state bug、或重構失誤都可能讓未授權頁面短暫顯示
- 縱深防禦原則：UI / API 兩層都該擋
- 修法簡單（每 page 多 5-10 行 server-side check），完全沒有 trade-off

## 目標

1. `/knowledge/[id]` server page：使用者對該 KB 沒有任何 role 時，呼叫 `notFound()`
2. `/knowledge/[id]/settings` server page：使用者對該 KB 不是 ADMIN 時，`redirect` 到 `/knowledge/[id]`（已有 detail 存取權但無設定權）；完全沒 role 時 `notFound()`
3. Client 端原有的 `userRole` 檢查保留（雙重保險）

## 非目標

- 不改 `getKnowledgeBaseRole` 的 system admin backdoor 邏輯（保留設計）
- 不改 API 層權限檢查（已正確，無需動）
- 不重構 client component（保留現有 fallback 訊息）
- 不處理「使用者剛被移除成員後，瀏覽器 cache 還顯示頁面」的 stale state（屬另一個 issue）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/(app)/knowledge/[id]/page.tsx` | 新增 `getKnowledgeBaseRole` 檢查；無 role → `notFound()` |
| `src/app/(app)/knowledge/[id]/settings/page.tsx` | 新增 ADMIN 檢查；非 ADMIN → `redirect`；無 role → `notFound()` |

### 新增測試

| 檔案 | 說明 |
|------|------|
| `src/app/(app)/knowledge/[id]/page.test.tsx` | 已登入但非成員 → notFound；成員 → 正常 render |
| `src/app/(app)/knowledge/[id]/settings/page.test.tsx` | 非 ADMIN → redirect；ADMIN → 正常 render；無 role → notFound |

## 風險

| 風險 | 緩解 |
|------|------|
| `notFound()` 在 server page 會走 `not-found.tsx`，要確認該檔案存在 | `src/app/not-found.tsx` 已存在（git status 確認），無問題 |
| 系統 admin 不再自動拿到所有 KB 存取 | 保留現有 `getKnowledgeBaseRole` 的 system admin 邏輯，admin 仍會被當作 ADMIN |
| Server page 多一次 DB query | `getKnowledgeBaseRole` 內部最多 3 次 query，可接受；client 那次 fetch 也保留，整體無回歸 |

## 驗收標準

1. 非成員以已登入帳號直接訪問 `/knowledge/<some-other-user-kb-id>` → 收到 404 頁面（not_found），不見任何 KB 細節
2. KB 的 VIEWER / CONTRIBUTOR 訪問 `/knowledge/<kb-id>/settings` → 被 redirect 回 `/knowledge/<kb-id>`，不見設定畫面
3. KB 的 ADMIN 或 creator 訪問 `/knowledge/<kb-id>/settings` → 正常顯示設定頁
4. 系統管理員（User.role === ADMIN）訪問任意 KB / settings → 正常進入（保留 backdoor）
5. 對應測試通過
