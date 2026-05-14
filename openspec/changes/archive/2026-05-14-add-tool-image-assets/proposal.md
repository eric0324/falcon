# Add Tool Image Assets

## Why

工具現在沒辦法挾帶固定圖片給所有使用者共用。bridge 的 ownership check 鎖住 `images/<callerUserId>/` 前綴，作者上傳的 logo / 樣板背景 / 浮水印，別人開工具來跑全部會 400 — 「跨用戶無法讀」。

實際被擋住的常見場景：
- 替使用者照片加公司浮水印
- 「跟代言人合照」工具
- 把照片貼進固定相框 / 雜誌封面 template
- 品牌風格的貼圖產生器

繞道方案都很差：每個使用者重新上傳一遍 logo、把 logo base64 寫死進 code、靠外部 CDN 託管。

## What Changes

引入「工具圖片資產」的概念：屬於 tool 的圖片放在 `tools/<toolId>/images/<uuid>.<ext>` 前綴下，凡是有權執行該工具的人都能透過 bridge 讀取。

### Deploy 時自動 promote

作者拖圖進 chat → 圖檔走既有 attachment 流程，存到 `images/<作者-userId>/...`。當作者按 deploy（`POST /api/tools`）：

1. 後端掃 tool code 找出所有引用的 s3Key
2. 凡是落在作者命名空間下（`images/<authorUserId>/...`）的 key：
   - 在 S3 用 `CopyObject` 複製到 `tools/<新toolId>/images/<原uuid>.<ext>`
   - 把 code 裡的舊路徑字串替換成新路徑
3. 更新後的 code 才寫進 `Tool.code`

UPDATE 路徑（再次 deploy）也跑同一段邏輯，已經是 `tools/<toolId>/...` 的不動，新加進來的才 promote。Idempotent。

### Bridge ownership 擴充

`image.read` / `image.edit` 的 ownership check 從「只接受 `images/<callerUserId>/...`」擴充成：

- 接受 `images/<callerUserId>/...`（既有，個人圖）
- 接受 `tools/<toolId>/...`，且 caller 通過 `canUserAccessTool(toolId)` 檢查

Bridge route 已經把 `toolId` 收進 request body，這個資訊可以傳到 handler 用於授權。

### 不變的東西

- `image.upload` 還是寫到 `images/<userId>/...` — 工具執行時使用者上傳的圖，仍然是「使用者自己的圖」
- 工具作者要做 asset，**完全透過 chat 對話** 完成。沒有獨立的 Asset 管理 UI
- 計費 / quota 規則不動

## Impact

- **Affected specs**:
  - `image-generation` — MODIFY bridge ownership 與 edit / read 接受的 key 集合
  - `tool` — ADD `Tool Image Assets`（promote 邏輯 + 生命週期）

- **Affected code**:
  - `src/app/api/tools/route.ts` — POST 流程加 asset promote
  - `src/lib/bridge/handlers.ts` — `handleImageRead` 與 `handleImageGenerate`（edit 路徑）放寬 ownership check
  - `src/app/api/bridge/route.ts` — 把 `toolId` 透傳到 `dispatchBridge`（已有，但要進一步往 `handleImage` 傳）
  - `src/lib/storage/s3.ts` — 加 `copyImage` helper
  - 新增 `src/lib/tool/asset-promote.ts` — 掃 code、複製 key、改寫 code

- **Breaking changes**: 無對外 API 變動
- **Migration**: 不必。歷史工具的 code 不會自動 backfill；下次 update deploy 時若有引用到 `images/<authorId>/...` 才會 promote
- **Risks**:
  - S3 多寫一份（每個 asset 雙份儲存），但成本可忽略
  - 作者刪除自己原圖 → tool 的 asset 副本仍在，不受影響（這是 feature，不是 bug）
  - 作者把示意圖丟給 AI、AI 自作主張寫進 code → 也會被 promote。語意上「AI 把它寫進 code = 它是 tool 的一部分」，可接受
  - Tool 被刪除時 assets 留在 S3 → orphan storage。本變更不處理 cleanup，留待後續 housekeeping cron
