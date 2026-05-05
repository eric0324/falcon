# Proposal: 個人記憶功能

## 概述

讓 Falcon 能跨對話記得使用者的偏好、背景、規則與事實。使用者不用每次對話重新交代「我是 HR 部門、我都用 Google Sheets、工具 UI 要長這種風格」。記憶透過兩條路徑建立：使用者明示觸發（關鍵字偵測，立刻存）與 AI 被動偵測（Haiku 提議，使用者確認才存）。下次對話時系統自動召回相關記憶塞進 system prompt。

## 動機

- Falcon 是任務型 agent，使用者每次建工具都要重交代身分 / 偏好 / 專案脈絡
- 觀察到使用者訊息常出現「我之前說過...」「跟上次一樣...」等重複引導
- 讓 AI 記住能大幅降低每輪對話的交代成本，也能讓建出來的工具更貼合個人慣例
- 市場已驗證（ChatGPT、Claude.ai 都有類似功能），使用者對這類能力有預期

## 目標

1. 新增 `Memory` 資料表，以 pgvector 儲存使用者個人記憶（可搜尋、可分類）
2. 主動擷取：偵測使用者訊息中的關鍵詞組，命中即存（confidence=high）
3. 被動擷取：對話結束後跑 Haiku 輕量 pass，產出候選記憶；使用者在側欄點確認才存（confidence=medium）
4. 召回：每則新訊息做 embedding，取 top-5 相關記憶塞入 system prompt（上限 2000 字元）
5. 管理：`/memory` 獨立頁可列 / 編 / 刪記憶，按 type 分類

## 非目標

- 不跨使用者共享記憶（每人獨立）
- 不做版本歷史（直接覆蓋編輯）
- 不自動過期（記憶永久保留，除非使用者刪除）
- 不做匯出 / 匯入
- 不支援手動新增記憶（使用者只能透過對話觸發，管理頁只能編 / 刪）
- 不做非 Anthropic 模型的被動擷取（第一版 Haiku only）

## 記憶分類（type enum）

| type | 說明 | 範例 |
|------|------|------|
| `preference` | 工具風格、命名、UI 偏好 | 「UI 要用深色主題」 |
| `context` | 使用者背景、身分、正在做的專案 | 「我在 HR 部門」「我正在做招募流程工具」 |
| `rule` | 明確規則，通用性高 | 「以後都用 Google Sheets 當資料來源」 |
| `fact` | 一次性事實 | 「我部門叫 HR Ops」 |

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `prisma/schema.prisma` | 新增 Memory model（userId, type, title, content, embedding, confidence, source, createdAt） |
| `src/app/api/chat/route.ts` | 整合主動擷取 + 召回；回應結束時觸發被動擷取（async，不阻塞） |
| `src/app/(app)/chat/page.tsx` | 新增側欄「建議記憶」卡片，讓使用者一鍵確認候選 |

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/memory/extract-explicit.ts` | 關鍵字觸發擷取（純函數，可測） |
| `src/lib/memory/extract-passive.ts` | Haiku 輕量擷取 pass |
| `src/lib/memory/recall.ts` | embedding 查詢 + top-K + 字數上限 |
| `src/lib/memory/embed.ts` | 包裝 `src/lib/knowledge/embedding.ts` |
| `src/lib/memory/store.ts` | Memory CRUD（Prisma wrapper） |
| `src/app/api/memory/route.ts` | GET (list) / POST (create from suggested) |
| `src/app/api/memory/[id]/route.ts` | PATCH / DELETE |
| `src/app/api/memory/suggested/route.ts` | GET 候選記憶 / POST 確認候選 |
| `src/app/(app)/memory/page.tsx` | 管理頁 |
| `src/__tests__/memory/*` | 單元 + 整合測試 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| AI 被動擷取錯 → 污染 context | 被動擷取一律走「建議 → 使用者確認」流程，不直接存 |
| 召回塞爆 system prompt | top-K=5，總字數上限 2000 字元，超過截斷（按相似度排序保留） |
| 使用者不知道此功能 | 第一次關鍵字觸發存記憶時，跳一次 toast 說明，並附「到 /memory 管理」連結 |
| Haiku 被動擷取增加成本 | 僅在對話結束時跑一次（非每則訊息），且 async 不阻塞回應；可在 system config 開關 |
| 關鍵字誤觸發（例：引用他人話） | 觸發後 AI 會顯示一次確認訊息（類似 toast），使用者可 undo |
| 召回不相關記憶干擾主模型 | 相似度分數低於門檻（例：0.65）的記憶不召回 |

## 驗收標準

1. 使用者說「以後都用 Google Sheets 當資料來源」→ 自動存成 `rule` 類記憶，confidence=high
2. 使用者下一次對話說「幫我建個表單工具」→ 召回該 rule，AI 回應直接用 Google Sheets
3. 使用者對話中提到「我在 HR 部門」→ 被動擷取列入候選，使用者點確認後存為 `context`
4. 使用者在 `/memory` 頁可看到所有記憶、可編輯內容、可刪除
5. 記憶刪除後，下次對話不再被召回
6. 召回時若所有相關記憶加起來超過 2000 字元，按相似度高到低塞，超過截斷
7. 單元測試覆蓋：關鍵字偵測 10+ case、召回字數截斷、型別分類
8. 整合測試：完整對話流程（擷取 → 儲存 → 召回）

## 開放問題（需使用者決定）

這些細節會影響實作，可以在進 apply 階段前或過程中逐步決定：

1. **被動擷取頻率** — 每則訊息後都跑？還是使用者離開對話時才跑？（後者省成本但延遲高）
   建議：每則 assistant 回應結束後跑一次（不阻塞），平衡成本與即時性
2. **被動擷取的 prompt 設計** — 輸入是整段對話還是最後幾則？
   建議：最近 6 則訊息（3 輪 user + assistant）作為 context
3. **召回時機** — 每則 user 訊息都召回？還是第一則才召回？
   建議：每則都召回（記憶可能在對話中被編輯）
4. **toast 提示的展示位置** — 對話泡泡旁？頁面右下角？
   建議：對話泡泡旁浮出，5 秒自動消失
