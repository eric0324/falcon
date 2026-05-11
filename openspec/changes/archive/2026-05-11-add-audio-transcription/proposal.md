# Proposal: 音訊轉錄能力（附件、AI 工具、Vibe Coding 三入口）

## 概述

新增 `audio-transcription` capability，把 OpenAI 的轉錄 API 包成內部 service，並開三個入口：
1. **附件路徑（A）**：使用者拖音檔當附件，送 chat 時後端自動轉錄為文字嵌入 prompt
2. **AI 工具（B）**：`transcribeAudio` tool 讓 AI 可以對 S3 上的舊音檔做轉錄
3. **Vibe Coding（C）**：透過 api-bridge 暴露 `transcribe` platform capability，使用者自製的工具可呼叫

三個入口共用同一個 `transcribeAudio()` core 函式。

## 動機

- Falcon 目前完全沒有音訊處理，使用者要把錄音轉成文字後才能丟給 AI
- 會議錄音、訪談、播客是常見需求；現有處理流就只能要使用者自己用第三方轉錄再貼進來
- OpenAI 提供現成 transcription API，套進 Falcon 不用自架模型、不用 GPU

## 目標

1. 核心 `src/lib/integrations/openai-audio/client.ts` 封裝 OpenAI `/v1/audio/transcriptions`
2. 預設模型 `gpt-4o-mini-transcribe`（$0.003/min，便宜且 WER 對乾淨音源夠用）
3. `language` 不固定，讓 OpenAI 自動偵測
4. 25MB 以上音檔拒收（OpenAI API 上限），不做切片
5. 入口 A：file-upload 接 audio MIME → 上傳 S3 `audios/<userId>/<uuid>.<ext>`，送 chat 時後端在 `buildMessageContent` 內同步轉錄、把 text 嵌入 prompt
6. 入口 B：`audio-tools.ts` 提供 `transcribeAudio({ audioKey, language? })` AI tool，從 S3 拉檔轉錄
7. 入口 C：`bridge/handlers.ts` 加 platform capability `dataSourceId: "transcribe"`，action `transcribe`，接 `audioUrl` 或 `audioBase64`
8. 計費：`audioPricing` 加入；TokenUsage `model = "gpt-4o-mini-transcribe"`、`outputTokens = ceil(durationSec / 60)` 視為「分鐘數」記錄

## 非目標

- 不做 mic 錄音 → 填輸入框（語音輸入）；本案只處理音檔轉錄
- 不切片：超過 25MB 直接拒收，不嘗試 ffmpeg 切段
- 不做說話者分離（`gpt-4o-transcribe-diarize` 2.5x 貴）；要時再另案
- 不快取轉錄結果；同檔多次 edit 重送會重轉（避免 cache invalidation 複雜度）
- 不曝出模型選項給使用者切；admin config 可改預設（未來）

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/openai-audio/client.ts` | `transcribeAudio(buffer, mime, opts)` + `isAudioConfigured()`（沿用 OPENAI_API_KEY） |
| `src/lib/integrations/openai-audio/client.test.ts` | 單元測試 |
| `src/lib/integrations/openai-audio/index.ts` | 重新匯出 |
| `src/app/api/chat/upload-audio/route.ts` | multipart 上傳音檔到 `audios/<userId>/<uuid>.<ext>` |
| `src/lib/chat/upload-audio-client.ts` | 前端 helper |
| `src/lib/ai/audio-tools.ts` | `createAudioTools()` 提供 `transcribeAudio` tool |
| `src/lib/ai/audio-tools.test.ts` | 同上 |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/components/file-upload.tsx` | ACCEPTED_TYPES 加 audio MIME；`processFile()` audio 分支：上傳 S3、`UploadedFile` 加 `kind: "audio"` 與 `durationSec?` |
| `src/app/api/chat/route.ts` | `buildMessageContent` audio 分支：拉 S3 → 呼 core → 嵌入 prompt；25MB 拒收回 400；AI tool 註冊 audioTools；計費寫入 TokenUsage |
| `src/lib/storage/s3.ts` | 若 `uploadImage` 名稱已含 image 偏見，可加 `uploadObject` 通用版（或直接複用） |
| `src/lib/bridge/handlers.ts` | 加 platform capability `transcribe`：action `transcribe`、params `{ audioUrl?, audioBase64?, language? }` |
| `src/app/api/bridge/route.ts` | platform capability 白名單加 `transcribe` |
| `src/lib/ai/models.ts` | `audioPricing["gpt-4o-mini-transcribe"] = 0.003`（per minute） |
| `src/components/chat-message.tsx` / FileList | 音檔附件卡片：🎙 icon + 檔名 + 時長；點擊可播放（可選） |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 同步轉錄會增加 chat 首 token 延遲 | 30 秒音檔約 1-3 秒；前端「正在轉錄...」訊息；長音檔（接近 25MB）使用者預期到延遲 |
| 重送訊息會重複收錢 | v1 不快取；之後若痛了再加 transcript persist 到 message attachment |
| 音檔格式繁雜（codec、container） | 白名單 mp3/wav/m4a/webm/ogg；其他 MIME 直接拒收 |
| 中文準確率 | auto-detect 在乾淨音源足夠；遇到差才考慮硬寫 `language: "zh"` |
| Vibe Coding C 入口可能被濫用 | bridge 已驗 session；轉錄 quota 沿用既有 monthly quota 機制 |

## 驗收標準

1. 上傳 5MB mp3 → 顯示音檔卡片（檔名 + 時長）→ 送 chat → AI 回覆能引用音檔內容
2. 上傳 30MB mp3 → 前端 / 後端拒收，回友善錯誤訊息
3. AI 在後續對話想對先前的音檔再處理 → 呼叫 `transcribeAudio({ audioKey })` 取得文字
4. Vibe Coding tool 在 sandbox 內呼 `bridge.transcribe({ audioUrl })` → 回 `{ text }`
5. 計費：30 秒英文音檔 → TokenUsage `model: "gpt-4o-mini-transcribe"`、`outputTokens: 1`（向上取整 1 分鐘）、`costUsd: 0.003`
6. 中、英、混合語音都能 auto-detect 出正確語言
7. 全部單元測試綠燈
