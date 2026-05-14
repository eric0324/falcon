# Tasks: add-image-bridge-capability

依順序執行，每項任務對應 spec scenario。

## 1. Bridge handler

- [x] 1.1 在 `src/lib/bridge/handlers.ts` 新增 `handleImage(userId, action, params)`，內部分派 `generate` / `edit`，呼叫 `generateFromText` / `generateFromImage`
- [x] 1.2 在 handler 開頭加 `checkQuota(userId)`，status `"blocked"` 時拋 `QuotaExceededError`（讓 bridge route 轉 403）
- [x] 1.3 `edit` 路徑驗證 `sourceImageKey` 必須以 `images/<userId>/` 開頭
- [x] 1.4 在 `dispatchBridge` 加上 `if (dataSourceId === "image") return handleImage(userId, action, params)`
- [x] 1.5 成功後寫入 `TokenUsage`（`kind="image"`, `userId`, `units=1`, `costUsd=estimateCost({kind:"image",...})`）

## 2. Bridge route 白名單

- [x] 2.1 `src/app/api/bridge/route.ts:42` 把 `dataSourceId === "image"` 加進 `isPlatformCapability`
- [x] 2.2 catch `QuotaExceededError`、回 403 `{ error: "quota_exceeded", quota }`

## 3. System prompt 條目

- [x] 3.1 在 `src/lib/ai/system-prompt.ts` 新增 `IMAGE_BRIDGE_INSTRUCTIONS` 字串（兩個 action 的範例、輸出格式、loading state 提醒）
- [x] 3.2 在 `imageGenerationEnabled` 的條件分支裡 `prompt += IMAGE_BRIDGE_INSTRUCTIONS`（兩處：line ~978 跟 ~1061）

## 4. 測試

- [x] 4.1 新增 `src/lib/bridge/handlers.image.test.ts` 涵蓋 10 個 case：generate 成功 + TokenUsage 寫入 + 預設 provider；edit 成功 + sourceImageKey ownership reject + 缺欄位；未知 action；quota=blocked → 403 + body；失敗不計費
- [ ] 4.2 route-level test 略過：route 改動只有兩處（白名單加 `image` + 多個 instanceof BridgeError 分支），handler test 已驗證 BridgeError 的 status/body，route mapping 邏輯極直接

## 5. 收尾

- [x] 5.1 `bun run lint` + `bun run test` + `bun run build` 全綠
- [x] 5.2 `openspec validate add-image-bridge-capability --strict --no-interactive` 通過
- [ ] 5.3 手動煙霧測：在 chat 開個有圖片 provider 的對話，叫 AI 幫忙寫個「按按鈕產圖」的工具，部署後執行確認 bridge 正確回傳（**待 deploy 後由人執行**）
- [ ] 5.4 archive：`openspec archive add-image-bridge-capability --yes`（**待 reviewer 確認後執行**）
