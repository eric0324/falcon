# Design: Add Image Bridge Capability

## Context

底層生成函式 `generateFromText / generateFromImage` 已存在於 `src/lib/ai/image-generation.ts`，唯一缺口是 bridge dispatcher 沒有條目。本變更等於把 audio-transcription 的 bridge 接法照貼到 image 上。

## Decisions

### 決定 1：dataSourceId 取名 `image`

**選項**
A. `image`（鏡射 `transcribe` 的簡短命名）✅
B. `generate-image`
C. `image-gen`

**選 A**。Bridge 既有的命名都是 short noun（`llm / transcribe / scrape / tooldb`），保持一致。

### 決定 2：兩個 action 還是一個

**選項**
A. `generate` + `edit` 分開 ✅
B. 統一 `generate`，靠 `sourceImageKey` 有無切換模式

**選 A**。理由：
- 兩種模式的必要欄位不同（`edit` 強制 `sourceImageKey`），分開讓 schema validation 更乾淨
- 系統提示對 AI 更明確：要編輯就用 `edit`，不要混淆
- 對齊既有 agent tool 的程式結構（`generateFromText` vs `generateFromImage` 本來就分開）

### 決定 3：sourceImageKey 必須屬於呼叫者

**選項**
A. 強制 `sourceImageKey` 以 `images/<userId>/` 開頭，否則 400 ✅
B. 不檢查，信任呼叫端

**選 A**。理由：
- 防跨用戶讀圖。即使工具是 public、任何登入使用者都能呼叫 bridge，也不能拿別人的圖去 edit
- 邏輯跟 audio 的 ownership check 一致（`audios/<userId>/`）
- `buildS3Key(userId)` 寫入時就用 `images/<userId>/`，所以這個前綴有實際語意

### 決定 4：計費邏輯走既有 `recordUsage` 等價路徑

**選項**
A. 在 `handleImage` 內 inline 寫 `prisma.tokenUsage.create({...})` ✅
B. 把 `image-tools.ts` 的 `recordUsage()` 抽到 `image-generation.ts` 供兩處共用

**選 A**（第一版）。理由：
- 寫入只有 7-8 行，重複可接受
- B 會牽動 `image-tools.ts`（agent tool）的測試與重構，超出本變更範圍
- 若日後第三、四個入口出現再抽

### 決定 5：System prompt 注入時機沿用 `imageGenerationEnabled` 旗標

**選項**
A. 只在 `imageGenerationEnabled === true` 時注入 ✅
B. 永遠注入（跟 LLM_BRIDGE 一樣）

**選 A**。理由：
- 既有 UI 模式：使用者選擇圖片 provider 才會 `imageGenerationEnabled = true`
- 若使用者沒選 provider，AI 即使知道 endpoint 也沒有預設 provider 可用，回應會糊掉
- 永遠注入會讓 prompt 變長、可能誘導 AI 不必要地加圖片功能

### 決定 6：Quota 阻擋邏輯

工具呼叫 image bridge 時，bridge 需先檢查呼叫者 quota。若 blocked，回 403 + `{ error: "quota_exceeded" }`。

實作上：`handleImage` 開頭呼叫 `checkQuota(userId)`，status === "blocked" 就拋一個 bridge route 會轉成 403 的 error。這跟 chat route 的 quota 檢查機制一致。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| 工具濫用：跑無窮迴圈產圖燒掉預算 | 既有 quota 機制 + 寫入時即計費。沒有額外 rate limit，由 quota cap 控制 |
| sourceImageKey ownership 檢查邏輯誤判（e.g. key prefix 拼錯） | 寫 unit test 驗證合法與非法 key |
| 系統提示太長導致 token 浪費 | 條目控制在 ~30 行內，跟 LLM_BRIDGE_INSTRUCTIONS 同等規模 |

## Open Questions

無。
