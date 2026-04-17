# Design: persist-message-attachments

## Context

這個 change 的直接需求是：使用者上傳檔案送出後，在訊息歷史中仍能看到自己附了什麼。痛點最明顯的情境是圖生圖 —— 上傳一張照片請 AI 修改，送出後原圖從 UI 消失，多輪編輯時分不清原圖在哪。

## 關鍵決策

### 1. 只存 metadata，不存原檔（非圖片檔）

**作法**：
- 圖片（png / jpeg / webp）已經因為圖片生成功能而上傳 S3 並有 `s3Key`，直接複用
- 非圖片檔（pdf / txt / csv / js / json 等）**不另外上傳 S3**，只存 `name` / `type` / `size`，歷史訊息顯示檔名 + icon

**理由**：
- 多加一個「通用檔案上傳到 S3」的 flow 會擴張 scope：新 API、credentials policy、清理策略、MIME 白名單擴充
- 使用者的直接需求是「看得到剛才附了什麼」，看得到檔名就能確認附件，並非要重新下載
- 之後若要支援「重新下載歷史附件」再另開 change

**Tradeoff**：
- 非圖片檔看不到內容也不能下載；但這與目前送訊息當下的 UX 一致（既有 FileUpload 也只顯示檔名）
- 圖片 vs 非圖片附件的使用者體驗不對等（一個有縮圖一個沒有），需要容忍

### 2. LLM 送訊息邏輯不變

**作法**：
- 新訊息：`files` base64 仍照既有方式塞進 user message parts 給 LLM
- 歷史訊息：送給 LLM 時只帶 `role` / `content` / `toolCalls`，**不重帶** attachments 的圖片 base64

**理由**：
- 歷史附件若重新送 base64 會爆 context（多輪編輯時持續累積）
- AI 的記憶靠 message text；圖片重讀一般靠使用者重新上傳
- attachments 純粹是「使用者視覺記錄」，和 LLM 溝通用的 `files` / `attachedImageKeys` 是兩件事

**Tradeoff**：
- 重開舊對話時 AI 看不到以前的圖；但既有行為也是這樣（既有 base64 每次打送）
- 使用者看得到舊圖，AI 看不到；若要讓 AI 重新看圖，手動重上傳

### 3. Presigned URL 批次簽於後端

**作法**：
- `getMessages` 讀完訊息後，掃描所有 `attachments[].s3Key`，一次 `Promise.all` 簽好 URL 放進 attachment
- 前端收到 `Message` 時每個 attachment 已有 `presignedUrl`
- 載入失敗時用既有 `/api/chat/presign-image` 重簽（前端元件同 `ImageResultCard`）

**理由**：
- 訊息渲染時每張圖 N 個 API call 開銷不小，尤其長對話
- 既有 S3 client 已配置好，批次 presign 成本低
- presigned URL TTL 1 小時夠使用者看完對話一輪；重整後靠前端 onError 重簽

**Tradeoff**：
- `getMessages` 多一段 presign 邏輯，但可容忍（所有 I/O 都並行）
- 若使用者開對話後放置超過 1 小時再回來看，第一次渲染會觸發重簽 burst（每張圖一個 call）—— 可接受，因為這是 cold reload 情境

### 4. attachments 存在 `Json` 欄位而非獨立表

**作法**：新增 `ConversationMessage.attachments Json?` 欄位。

**理由**：
- 附件沒有跨訊息關聯、不需要獨立查詢
- 和 `toolCalls` 既有 pattern 一致（也是 Json 存在 message 裡）
- 若未來需要跨對話搜尋附件再另開獨立表

### 5. Migration 為純新增欄位，無資料回填

**作法**：`ALTER TABLE "ConversationMessage" ADD COLUMN "attachments" JSONB;`

**理由**：
- 既有訊息沒附件資訊可用，保持 NULL 即可
- 新欄位 NULLable 可向前相容，舊程式讀取忽略該欄位也不壞

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| Presigned URL 過期後圖破圖 | 前端 `<img onError>` 呼叫 `/api/chat/presign-image` 重簽（既有元件 pattern） |
| `s3Key` 屬於別的 user（plan 或 bug） | presign endpoint 已驗證 `images/<userId>/` 前綴 |
| Attachments JSON 結構演進 | 初版定 `{ name, type, size, s3Key? }`，若後續加欄位保持向前相容（optional 欄位） |
| 舊訊息 attachments = null | 讀取時 fallback 空陣列，不影響渲染 |

## 不在本 change 範疇

- 非圖片檔的 S3 上傳與下載
- 歷史附件重新送給 LLM
- 圖片點擊放大 / 下載 / 複製（只做縮圖顯示）
- 附件跨對話搜尋或管理
