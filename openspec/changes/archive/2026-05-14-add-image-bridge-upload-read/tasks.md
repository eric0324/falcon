# Tasks: add-image-bridge-upload-read

依順序執行，每項任務對應 spec scenario。

## 1. Bridge handler — upload

- [x] 1.1 在 `src/lib/bridge/handlers.ts` 的 `handleImage` 內新增 `case "upload"`：驗證 `base64` 是 string、`mimeType` 在白名單（png/jpeg/webp），缺欄位 → `BridgeError(400)`、MIME 不對 → `BridgeError(415)`
- [x] 1.2 base64 decode 後檢查 `buffer.byteLength <= 10MB`，超過 → `BridgeError(413)`
- [x] 1.3 構 key `images/<userId>/<uuid>.<ext>`，呼叫 `uploadImage`、`getPresignedUrl`，回傳 `{ s3Key, presignedUrl }`
- [x] 1.4 上傳路徑不寫 `TokenUsage`、不檢 quota

## 2. Bridge handler — read

- [x] 2.1 在 `handleImage` 內新增 `case "read"`：驗證 `s3Key` 是 string、且以 `images/<userId>/` 開頭，否則 `BridgeError(400)`
- [x] 2.2 預設 `includeBytes: false`：只呼叫 `getPresignedUrl`，回傳 `{ s3Key, presignedUrl }`
- [x] 2.3 `includeBytes: true`：用 `getObjectBuffer` 拉 buffer、編 base64、依副檔名導出 `mimeType`，回傳 `{ s3Key, presignedUrl, base64, mimeType }`
- [x] 2.4 S3 NoSuchKey → `BridgeError(404, "image not found")`

## 3. System prompt 更新

- [x] 3.1 在 `src/lib/ai/system-prompt.ts` 的 `IMAGE_BRIDGE_INSTRUCTIONS` 加 `upload` / `read` 範例
- [x] 3.2 補一段 helper `fileToBase64(file)` 範例，給 AI 寫工具時參考

## 4. 測試

- [x] 4.1 `src/lib/bridge/handlers.image.test.ts` 補 case：
  - upload 成功路徑：產生符合 prefix 的 s3Key、回 presignedUrl、不寫 TokenUsage
  - upload 各種失敗：缺欄位 / 非白名單 MIME / 超 10MB
  - read 預設 URL-only：不呼叫 getObjectBuffer、回沒有 base64
  - read includeBytes=true：呼叫 getObjectBuffer、回 base64 + mimeType
  - read ownership reject

## 5. 收尾

- [x] 5.1 `bun run lint` + `bun run test` + `bun run build` 全綠
- [x] 5.2 `openspec validate add-image-bridge-upload-read --strict --no-interactive` 通過
- [ ] 5.3 手動煙霧測：chat 開有 image provider 的對話，請 AI 做一個「上傳照片 → 改顏色」工具，按上傳跑通、再按 edit 跑通（**待 deploy 後人工執行**）
- [ ] 5.4 archive：`openspec archive add-image-bridge-upload-read --yes`（**等 reviewer 確認**）
