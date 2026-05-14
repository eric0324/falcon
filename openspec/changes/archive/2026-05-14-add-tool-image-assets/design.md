# Design: Add Tool Image Assets

## Context

Tool 程式碼是純字串存在 `Tool.code`。Bridge 的 ownership check 鎖死 `images/<userId>/`，所以任何「跨用戶共用圖檔」的工具就做不出來。本變更不引入 schema 變動或新 UI，靠：

1. Deploy 時掃 code 把作者命名空間的 key 複製到 tool 命名空間
2. Bridge ownership check 對 `tools/<toolId>/...` 走「能用該工具」的判斷

## Decisions

### 決定 1：用 deploy-time promote，不要 chat-time 作標記

**選項**
A. Deploy 時 server 掃 code、自動 promote ✅
B. Chat 時 UI 讓作者明確「mark as tool asset」
C. 在 chat 階段就直接寫進 conversation-level 命名空間

**選 A**。理由：
- 零 UI 改動，作者體感跟現在丟附件一模一樣
- AI agent 不需要學新動作（`uploadAsset`）— 只用既有 `image.upload`
- 「AI 把它寫進 code = 它是 tool 的一部分」這個語意清晰、不容易誤判
- B 需要新 UI + 新 chat-side 動作；C 需要解決 conversation 跟最終 tool 的對應、複雜度高

代價：作者若隨手丟一張示意圖、AI 又把它寫進 code，會被 promote。語意上仍合理。

### 決定 2：S3 `CopyObject` 不是 server-side download+upload

**選項**
A. 用 S3 `CopyObject` API 在 bucket 內複製 ✅
B. Server 從 S3 下載 → 重新上傳

**選 A**。理由：
- `CopyObject` 不經 server，bytes 留在 S3 內部、速度快
- 不耗 server memory（大圖也不是問題）
- AWS SDK 一行 call

### 決定 3：Key 掃描走簡單 regex，不要 AST 解析

**選項**
A. Regex 找 `images/<authorId>/[a-z0-9-]+\.(png|jpg|jpeg|webp)` ✅
B. 用 Babel parse 找字串字面

**選 A**。理由：
- code 是字串、key 格式固定且很特殊（uuid 前綴 `images/<userId>/`）
- regex 不會跨用字串邊界 match（key 內沒有空白 / 引號）
- AST 解析額外耗時、且我們已經有 `runRuleScan` 在掃 code，再多裝一份 parsing 不划算

邊角 case：若 code 把 key 拆字串拼起來（`"images/" + userId + "/" + uuid`）→ regex 不會 match。可接受 — 這種寫法極罕見、AI 也不會這樣寫。

### 決定 4：toolId 預先生成、不是 create 後再 update

**選項**
A. Promote 前先 `cuid()` 出 toolId、用它做 promote、最後一次 `create` 把 promote 後的 code 寫進去 ✅
B. 先 create 拿到 id、再掃 code、再 update

**選 A**。理由：
- 單筆 DB 寫，少一次 update round trip
- 不會出現「tool 已存在但 code 還沒 promote」的中間狀態

代價：要 prisma 接受顯式 `id`。Prisma 預設 cuid 是 `@default(cuid())`，可以被覆寫。OK。

### 決定 5：UPDATE 路徑也跑同一段邏輯

**選項**
A. UPDATE 時也掃 + promote 新引用 ✅
B. UPDATE 不動 asset

**選 A**。理由：
- 作者編輯工具加新圖很自然，UI 上不該有「第一次 deploy 才能加 asset」這種規則
- Idempotent：已經是 `tools/<toolId>/...` 的不重複 promote

### 決定 6：Bridge ownership 用 caller 是否能 access tool 來判定

**選項**
A. 看 caller 是否 `canUserAccessTool(toolId)` ✅
B. 凡是 `tools/<X>/...` 開頭一律放行（只要 key 存在）

**選 A**。理由：
- B 等於 bypass 整套 visibility（私有工具的 asset 別人也能讀）
- A 跟既有 tool access 規則完全一致，新增的安全模型最小

需要 bridge 知道 `toolId`。Bridge route 已經收 `toolId` in body；要把它一路傳到 `handleImage` / `handleImageRead`。

### 決定 7：caller 通過 `image.read` / `image.edit` 帶 `tools/<X>/...` key，X 可以跟 request 帶的 toolId **不同** 嗎？

- 假設 toolId=A 的工具 code 寫了 `image.read({ s3Key: "tools/B/foo.png" })`，從 tool A 的執行 context 呼叫
- 嚴格：必須 `X === requestToolId`，否則 reject
- 寬鬆：caller 對 tool B 有 access 即可（即使現在跑的是 tool A）

**選嚴格**：`X === requestToolId`。理由：
- 防止 tool A 的程式碼意外/惡意讀 tool B 的內部 asset（即使作者重疊）
- 簡化 mental model：tool 的 code 只能讀自己的 asset 或 caller 的個人圖

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| S3 雙份儲存 | 成本可忽略；orphan cleanup 後續做 |
| 作者刪除個人圖 / 帳號被砍 | Tool 的 asset 是獨立 copy，不受影響 |
| Tool 被刪除 → asset orphan | 後續 cron job 清理；不在本變更範圍 |
| Regex 誤判 / 漏判 | 漏判：拆字串拼 key 不 match → 罕見，不 promote 也只是退化成現狀行為；誤判：注釋 / 字串裡寫了像 key 的東西 → 多複製一份檔，無功能影響 |
| 大 code（萬行）regex 慢 | 正則只跑一次、小於 100ms |

## Open Questions

無。
