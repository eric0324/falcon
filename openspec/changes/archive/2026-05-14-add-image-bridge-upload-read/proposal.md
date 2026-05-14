# Add Image Bridge Upload + Read

## Why

`add-image-bridge-capability` 讓部署的工具可以呼叫 `image.generate` 與 `image.edit`，但兩個缺口：

1. **使用者沒辦法把自己的圖傳進工具**：tool 的 iframe 是 sandbox（沒有 `allow-same-origin`），裡頭 `fetch("/api/chat/upload-image")` 不會帶 cookie，會 401。所以工具 UI 上的 `<input type="file">` 沒地方送上去。`image.edit` 雖然接受 `sourceImageKey`，但 key 怎麼來沒人能填。
2. **使用者沒辦法讀回自己上傳/生成的圖**：presignedUrl 1 小時就過期，長壽 UI 需要重簽；同樣因為 sandbox，工具沒辦法呼叫既有的 `/api/chat/presign-image`。

兩個都解 bridge 應該補上 `upload` 跟 `read`，跟 `generate / edit` 同一個 `dataSourceId: "image"` 底下並列。

## What Changes

### Action: `upload`

```js
const result = await window.companyAPI.execute("image", "upload", {
  base64: "iVBORw0KGgo...",   // 不含 data: prefix
  mimeType: "image/png",       // image/png | image/jpeg | image/webp
});
// result = { s3Key, presignedUrl }
```

- 大小：base64 解碼後 ≤ 10MB（與既有 `/api/chat/upload-image` 對齊）
- MIME 白名單：`image/png` / `image/jpeg` / `image/webp`
- 寫入 `images/<callerUserId>/<uuid>.<ext>`，永遠歸 caller 所有
- 不計 `TokenUsage`、不過 quota（純儲存、成本可忽略）
- 失敗 → `BridgeError` 對應 400 / 413 / 415

### Action: `read`

```js
const result = await window.companyAPI.execute("image", "read", {
  s3Key: "images/<userId>/abc.png",
  includeBytes: false,  // 預設 false：只回 presignedUrl
});
// result = { s3Key, presignedUrl, base64?, mimeType? }
```

- `s3Key` 必須屬於 caller（前綴 `images/<userId>/`），否則 400
- 預設 `includeBytes: false` → 只 presign、不下載 → 輕量、適合 UI 重新整理 URL
- `includeBytes: true` → 額外從 S3 拉 buffer、回傳 base64 + mimeType，給需要程式化處理的工具用
- 不計 `TokenUsage`、不過 quota
- 找不到 key → 404；其他失敗 → 500

### System prompt 條目更新

`IMAGE_BRIDGE_INSTRUCTIONS` 加上 `upload` 跟 `read` 的範例，並示範一段「File → base64」的 helper（使用者比較容易在 chat 裡看到範例後直接抄）：

```js
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

## Impact

- **Affected specs**: `image-generation` — ADD 一個 requirement `Vibe Coding Bridge — Image Upload and Read`
- **Affected code**:
  - `src/lib/bridge/handlers.ts` — `handleImage` 加 `upload` / `read` 兩個 case
  - `src/lib/ai/system-prompt.ts` — `IMAGE_BRIDGE_INSTRUCTIONS` 補範例
- **Breaking changes**: 無
- **Migration**: 不必，純新增
- **Risk**:
  - **上傳濫用**：tool code 可以塞滿 S3。本變更不加 quota，靠後續做 rate limit 或上傳次數監測。
  - **base64 in postMessage**：10MB 圖會變 ~13MB 字串，瀏覽器有上限但遠未踩到。
- **Dependency**: 依賴 `add-image-bridge-capability` 已啟用（dispatch 已認 `image`、`isPlatformCapability` 已含 `image`）。該 change 已 apply 但未 archive；本變更不需要等它 archive，code 已活
