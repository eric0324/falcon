# Design: Add Image Bridge Upload + Read

## Context

工具 sandbox iframe 沒 `allow-same-origin`，無法直接呼叫 `/api/chat/upload-image` 或 `/api/chat/presign-image`（沒帶 cookie → 401）。所以這兩個能力必須走 bridge postMessage，由 parent 帶 session 轉送。

## Decisions

### 決定 1：sealed within `dataSourceId: "image"`

**選項**
A. 把 upload / read 放進現有 `image` 命名空間 ✅
B. 新增 `image-upload`、`image-read` 兩個 dataSourceId

**選 A**。理由：
- 概念上都跟「圖片資產」相關，使用者讀的 mental model 是同一個東西
- 不必動 `isPlatformCapability` 白名單
- 跟 `tooldb` 一個 namespace 下多個 action 的設計一致

### 決定 2：base64 over postMessage（不走 presigned PUT）

**選項**
A. tool 把 File → base64 → 透過 bridge 傳 ✅
B. bridge 發 presigned PUT URL，tool 直接 PUT 到 S3

**選 A**。理由：
- B 需要 S3 bucket 設 CORS，repo 目前沒看到 CORS 設定，會踩雷
- 10MB 上限下 base64 = ~13MB，postMessage 沒問題
- 與既有 `audio.transcribe` 的 base64 入參一致，認知負擔小
- 若日後要支援大檔（>50MB），再考慮 B

### 決定 3：read 預設 URL-only，bytes 是 opt-in

**選項**
A. `read` 預設只回 presignedUrl，`includeBytes: true` 時才下載 + 回 base64 ✅
B. `read` 永遠下載 bytes 一起回

**選 A**。理由：
- 大宗使用情境是「重簽過期 URL」— 不需要拉 bytes
- 全拉浪費 S3 GET 流量
- API 仍簡單：呼叫端傳一個 bool 即可

### 決定 4：upload / read 不過 quota / 不計費

**選項**
A. 不計費、不過 quota ✅
B. 上傳每張收 $0.001（佔位數）

**選 A**。理由：
- S3 儲存與請求成本對 prod 使用量幾近 0（單張 < $0.0001）
- AI / 圖片生成這類昂貴調用才需要 quota；放在儲存上反而妨礙正常使用
- 若日後出現濫用（10 萬張惡意上傳），用 rate limit 或 hard cap 處理

### 決定 5：強制 ownership prefix `images/<userId>/`

**選項**
A. `read` 與 `edit` 一樣，s3Key 必須以 `images/<userId>/` 開頭 ✅
B. 信任呼叫端、不檢

**選 A**。理由：
- 防跨用戶讀圖。即使 tool 是 public、被別人開來用，呼叫者也只能讀自己的圖
- 與 `add-image-bridge-capability` 的 ownership check 完全一致

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| 上傳濫用塞滿 S3 | 不在本變更處理；日後若觀察到，再加 rate limit 或每人總容量上限 |
| base64 解碼後 size 不等於前端宣稱的 size | server side 解碼後實測 byte length 才 reject，不信任 client size |
| MIME spoofing | 只比對 `mimeType` 字串白名單；不做 magic byte 驗證（既有 `/api/chat/upload-image` 也沒做，保持一致） |

## Open Questions

無。
