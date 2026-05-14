# Tasks: add-tool-image-assets

依順序執行，每項對應 spec scenario。

## 1. S3 copy helper

- [x] 1.1 在 `src/lib/storage/s3.ts` 新增 `copyImage({ fromKey, toKey })`：用 `CopyObjectCommand` 內部複製，保留 contentType
- [x] 1.2 寫 unit test 驗證 source/destination key、bucket、CopySource 串接正確

## 2. Asset promotion helper

- [x] 2.1 新增 `src/lib/tool/asset-promote.ts`，exports `promoteAuthorAssets({ code, authorId, toolId })`：
  - regex 掃 `images/<authorId>/<uuid>\.(png|jpg|jpeg|webp)`
  - 對每個 hit：`copyImage(from → tools/<toolId>/images/<uuid>.<ext>)`、`code.replaceAll(old, new)`
  - 返回 `{ rewrittenCode, promotedCount }`
- [x] 2.2 邏輯 idempotent：如果同一個 key 已經被改寫過，跳過（regex 不會二次 match `tools/...` 開頭的字串，天然 idempotent）
- [x] 2.3 Unit test：作者圖被搬、其他用戶圖不動、無圖工具不影響、重跑 idempotent

## 3. Wire into deploy route

- [x] 3.1 `src/app/api/tools/route.ts` POST：
  - 在 `prisma.tool.upsert / create` **之前** 預先生 `id = cuid()`
  - 呼叫 `promoteAuthorAssets({ code, authorId: userId, toolId: id })`
  - 用 rewrittenCode 寫進 `Tool.code`、用預生的 id 進 create / upsert
- [x] 3.2 對 upsert 路徑：先查既有工具的 id（如果 conversationId 已綁了 tool），用既有 id，否則才生新 id

## 4. Bridge ownership 放寬

- [x] 4.1 `src/lib/bridge/handlers.ts`：`handleImage` 新增 `requestToolId` 參數，從 `dispatchBridge` 一路傳進來
- [x] 4.2 新增內部 `checkImageKeyOwnership(key, userId, requestToolId)`：
  - `images/<userId>/...` → OK
  - `tools/<X>/...` AND `X === requestToolId` AND `canUserAccessTool({id: X, ...}, userId) === true` → OK
  - 其他 → throw `BridgeError(400)`
- [x] 4.3 `handleImageGenerate` 的 edit 分支、`handleImageRead` 改用 `checkImageKeyOwnership`
- [x] 4.4 `handleImageUpload` 不變（永遠寫個人空間）

## 5. dispatchBridge 透傳 toolId

- [x] 5.1 `dispatchBridge` 簽名加 `context?: { toolId? }` 已存在，把 toolId 傳給 `handleImage(userId, action, params, context?.toolId)`

## 6. 測試

- [x] 6.1 `handlers.image.test.ts` 補：
  - `image.edit` 用 `tools/T1/...` key、request toolId=T1、caller has access → OK
  - 同上但 caller no access → 400
  - `image.edit` 用 `tools/T2/...` key、request toolId=T1 → 400
  - `image.read` 同三個 case
- [x] 6.2 promote helper test：
  - code 含一個作者圖 → 搬到 tool 路徑、code 改寫
  - code 含他人圖 → 不搬、不改
  - code 含已 promote 的 `tools/X/...` → 不重複
  - code 無圖 → 0 copies、code 不變
- [x] 6.3 `POST /api/tools` integration test：
  - 模擬 promote 流程，確認最終 `Tool.code` 是 rewritten 版本

## 7. 系統提示更新

- [x] 7.1 `IMAGE_BRIDGE_INSTRUCTIONS` 加一段：「作者拖進 chat 的圖會在 deploy 時自動變成 tool asset，所有使用者都能讀。Tool code 直接引用拖進來的 s3Key 就好，deploy 後路徑會自動改寫成 `tools/<toolId>/...`」

## 8. 收尾

- [x] 8.1 `bun run lint` + `bun run test` + `bun run build` 全綠
- [x] 8.2 `openspec validate add-tool-image-assets --strict --no-interactive` 通過
- [ ] 8.3 手動煙霧測：chat 拖一張 logo、請 AI 寫「在使用者照片加 logo」工具、deploy、用另一個帳號登入跑 → 應該能讀到 logo（**待 deploy 後人工執行**）
- [ ] 8.4 archive（**待 reviewer 確認**）
