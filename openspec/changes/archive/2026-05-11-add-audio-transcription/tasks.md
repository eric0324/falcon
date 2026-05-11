# Tasks: 音訊轉錄能力

## Task 1: Core client

- [x] `src/lib/integrations/openai-audio/client.ts`
  - [x] 常數：`OPENAI_AUDIO_URL = "https://api.openai.com/v1/audio/transcriptions"`、`MAX_BYTES = 25 * 1024 * 1024`、`DEFAULT_MODEL = "gpt-4o-mini-transcribe"`
  - [x] `isAudioConfigured()`：沿用 `OPENAI_API_KEY`
  - [x] `transcribeAudio(buffer, mime, opts?)`：multipart 送 OpenAI、回 `{ text, durationSec? }`
  - [x] `AudioTranscriptionError` 自訂錯誤
  - [x] MIME 白名單 + buffer size 檢查
- [x] `src/lib/integrations/openai-audio/client.test.ts`
- [x] `src/lib/integrations/openai-audio/index.ts`

## Task 2: S3 上傳 endpoint

- [x] `src/app/api/chat/upload-audio/route.ts`
  - [x] multipart 接 audio Blob
  - [x] MIME 白名單：mp3/wav/m4a/webm/ogg/mpeg
  - [x] 大小檢查 25MB
  - [x] 上 S3 `audios/<userId>/<uuid>.<ext>`
- [x] `src/lib/chat/upload-audio-client.ts`：前端 helper（仿 upload-image-client）

## Task 3: file-upload 整合（入口 A 前半）

- [x] `src/components/file-upload.tsx`
  - [x] ACCEPTED_TYPES 加 audio MIME 與 ACCEPTED_EXTENSIONS
  - [x] `UploadedFile` 介面加 `kind?: "image" | "audio" | "text" | "binary"` 與 `durationSec?`
  - [x] `processFile()` audio 分支：呼 `uploadAudioToS3` 取 audioKey、用 HTML5 Audio() 取 duration
  - [x] FileList 音檔卡片：🎙 icon + 檔名 + 時長（`durationSec` 顯示成 mm:ss）

## Task 4: chat route 整合（入口 A 後半）

- [x] `src/app/api/chat/route.ts`
  - [x] `buildMessageContent` audio 分支：從 `f.s3Key` 拉 buffer（用 `getObjectBuffer`）、呼 core `transcribeAudio`、把 text 嵌進 prompt（格式 `[音檔: name, 時長 X:XX, 轉錄:]\n<text>`）
  - [x] 25MB 在 chat route 也檢查一次，超過 throw 400
  - [x] audio MIME 不算 `isTextReadableMime`（不要走文字 truncate 路徑）

## Task 5: AI tool（入口 B）

- [x] `src/lib/ai/audio-tools.ts`
  - [x] `createAudioTools(ctx)`：`transcribeAudio({ audioKey, language? })` tool
  - [x] 從 S3 拉 buffer、驗 ownership（`audios/<ctx.userId>/...`）、呼 core、回 `{ type: "transcription", text, durationSec }`
- [x] `src/lib/ai/audio-tools.test.ts`
- [x] `chat/route.ts` 註冊 audioTools（無條件啟用，跟 image-tools 一樣）

## Task 6: api-bridge 整合（入口 C）

- [x] `src/lib/bridge/handlers.ts` 加 case `dataSourceId === "transcribe"`：
  - [x] action `transcribe`、params `{ audioUrl?, audioBase64?, language? }`
  - [x] 兩者擇一必填；audioUrl 走 fetch；audioBase64 直接 Buffer.from
  - [x] 呼 core、回 `{ text, durationSec }`
- [x] `src/app/api/bridge/route.ts` 的 `isPlatformCapability` 加 `transcribe`
- [x] `openspec/specs/api-bridge/spec.md` 補一段（會由 archive 自動帶入）

## Task 7: 計費

- [x] `src/lib/ai/models.ts` 加 `audioPricing: Record<string, number>`，`"gpt-4o-mini-transcribe": 0.003`（per minute）
- [x] `estimateCost` 增加 audio 分支或新函式 `estimateAudioCost(model, durationSec)`
- [x] `chat/route.ts` 在 audio 轉錄完成後寫 `TokenUsage`：`outputTokens = ceil(durationSec / 60)`
- [x] `audio-tools.ts` 與 bridge handler 也記錄計費（共用 helper）

## Task 8: 測試與收尾

- [x] 跑 `npx tsc --noEmit` 與 `npx vitest run` 全綠
- [x] 手動測試：
  - [x] 拖 mp3 → 卡片顯示時長 → 送出 → AI 引用內容
  - [x] 上傳 > 25MB → 拒收
  - [x] 對前訊息音檔讓 AI 用 `transcribeAudio` tool
  - [x] 用一個 Vibe Coding 工具呼叫 `bridge.transcribe({ audioUrl })`
- [x] changelog 加一筆（minor bump：新外部能力）
- [x] `openspec archive add-audio-transcription --yes`

## 依賴關係

```
Task 1 ← Task 2 ← Task 3 ← Task 4 (A)
Task 1 ← Task 5 (B)
Task 1 ← Task 6 (C)
Task 4 / 5 / 6 ← Task 7 (計費)
                ← Task 8
```

Task 1 是 core，所有後續入口 depend。Task 2-3 是 A 的 UI 路徑；Task 5、6 平行；Task 7 統一收尾。
