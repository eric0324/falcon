# usage-tracking Specification

## Purpose
TBD - created by archiving change unify-token-usage-tracking. Update Purpose after archive.
## Requirements
### Requirement: TokenUsage Schema

The system SHALL persist every billable AI operation to `TokenUsage` with an explicit `kind` discriminator and dedicated columns for cache tokens and non-token units, so that the semantics of every column is fixed regardless of the operation type.

The schema SHALL include:

- `kind: String` — one of `"chat"`, `"audio"`, `"image"`, `"embedding"`
- `userId: String?` — owner. NULL means system-level cost (not charged to any user)
- `model: String` — provider model identifier
- `inputTokens: Int` — prompt tokens as reported by the provider. For chat this INCLUDES cache-read and cache-write portions. For audio / image this MUST be 0.
- `outputTokens: Int` — completion tokens. For audio / image this MUST be 0.
- `cacheReadTokens: Int` (default 0) — tokens served from prompt cache
- `cacheWriteTokens: Int` (default 0) — tokens written to prompt cache (Anthropic only)
- `totalTokens: Int` — equals `inputTokens + outputTokens`. For audio / image rows this is 0.
- `units: Int` (default 0) — non-token billable units: minutes for audio, image count for image. MUST be 0 for chat / embedding.
- `costUsd: Float` — actual cost in USD, computed at write time using the pricing in effect at that moment. This is the canonical source of truth for cost.
- `conversationMessageId: String?` — optional link to the assistant message that produced this usage
- `createdAt: DateTime`

#### Scenario: Chat row populates token columns only

- GIVEN a chat call returns `inputTokens=1200`, `outputTokens=400`, cacheRead=800, cacheWrite=100
- WHEN the system writes the `TokenUsage` row
- THEN `kind="chat"`, `inputTokens=1200`, `outputTokens=400`, `cacheReadTokens=800`, `cacheWriteTokens=100`, `totalTokens=1600`, `units=0`

#### Scenario: Audio row populates units only

- GIVEN an audio transcription with `durationSec=75` (rounds up to 2 minutes)
- WHEN the system writes the `TokenUsage` row
- THEN `kind="audio"`, `inputTokens=0`, `outputTokens=0`, `totalTokens=0`, `units=2`, `costUsd = audioPricing[model] * 2`

#### Scenario: Image row populates units only

- GIVEN an image generation produces 1 image
- WHEN the system writes the `TokenUsage` row
- THEN `kind="image"`, `inputTokens=0`, `outputTokens=0`, `totalTokens=0`, `units=1`, `costUsd = imagePricing[model] * 1`

#### Scenario: Embedding row populates input tokens only

- GIVEN an embedding call returns `usage.total_tokens=320`
- WHEN the system writes the `TokenUsage` row
- THEN `kind="embedding"`, `inputTokens=320`, `outputTokens=0`, `totalTokens=320`, `units=0`, `costUsd = embeddingPricing[model] * 320 / 1_000_000`

### Requirement: estimateCost Discriminated Contract

The `estimateCost` function SHALL accept a discriminated union keyed by `kind` so that callers cannot accidentally pass token counts to an image / audio model and get a silently miscalculated cost.

```
estimateCost({ kind: "chat",      model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens })
estimateCost({ kind: "audio",     model, minutes })
estimateCost({ kind: "image",     model, imageCount })
estimateCost({ kind: "embedding", model, inputTokens })
```

For `kind="chat"`, the function SHALL deduct `cacheReadTokens + cacheWriteTokens` from `inputTokens` before applying base input pricing, and add the cache portions separately using provider-specific multipliers.

#### Scenario: Chat cost subtracts cache from base input

- GIVEN `kind="chat"`, model=`claude-haiku`, `inputTokens=1200`, `outputTokens=400`, `cacheReadTokens=800`, `cacheWriteTokens=100`
- WHEN `estimateCost` runs
- THEN base input cost uses `nonCachedInput = 1200 - 800 - 100 = 300`
- AND cache read cost uses `800 * inputPrice * 0.1` (Anthropic read multiplier)
- AND cache write cost uses `100 * inputPrice * 1.25` (Anthropic write multiplier)
- AND output cost uses `400 * outputPrice`

#### Scenario: Audio cost is per-minute

- GIVEN `kind="audio"`, model=`gpt-4o-mini-transcribe`, `minutes=2`
- WHEN `estimateCost` runs
- THEN the result equals `audioPricing["gpt-4o-mini-transcribe"] * 2`

#### Scenario: Image cost is per-image

- GIVEN `kind="image"`, model=`imagen-4`, `imageCount=1`
- WHEN `estimateCost` runs
- THEN the result equals `imagePricing["imagen-4"] * 1`

#### Scenario: Embedding cost is per-million-input-tokens

- GIVEN `kind="embedding"`, model=`voyage-3`, `inputTokens=320`
- WHEN `estimateCost` runs
- THEN the result equals `embeddingPricing["voyage-3"] * 320 / 1_000_000`

### Requirement: costUsd Is The Canonical Source

All cost displays and quota arithmetic SHALL read the persisted `TokenUsage.costUsd` value. Callers MUST NOT re-compute cost from `inputTokens / outputTokens / units` at read time, because pricing tables may change and historical rows must continue to reflect the actual amount billed.

#### Scenario: Admin display reads stored cost

- GIVEN a `TokenUsage` row with `costUsd=0.0142`
- WHEN any admin page shows the cost of that operation
- THEN it shows `$0.0142`, regardless of whether the current pricing table has since changed

#### Scenario: Pricing change does not retroactively alter history

- GIVEN historical rows written under the old pricing
- WHEN the operator updates `modelPricing` / `audioPricing` / `imagePricing` in code
- THEN existing rows' `costUsd` values are not recomputed and not updated

### Requirement: System-Level Cost (userId NULL)

When a `TokenUsage` row has `userId=NULL`, the system SHALL treat it as platform cost and SHALL NOT include it in any per-user quota aggregation.

#### Scenario: getMonthlyUsage ignores system rows

- GIVEN a user has $5 of personal usage AND the platform also wrote $0.50 of embedding usage with `userId=NULL` in the same month
- WHEN `getMonthlyUsage(userId)` runs
- THEN the result is `5.00`, not `5.50`

#### Scenario: System-level row still appears in cost reports

- GIVEN an admin opens a system-wide cost dashboard (future feature)
- WHEN the query selects all rows in a date range without filtering by `userId`
- THEN both per-user and `userId=NULL` rows are summed

### Requirement: Backward-Compatible Migration With Backfill

The migration that introduces `kind / cacheReadTokens / cacheWriteTokens / units` SHALL also backfill existing rows so that no row remains in the legacy state where `outputTokens` encodes minutes or image counts.

#### Scenario: Audio model rows migrate to kind=audio

- GIVEN a pre-migration row with `model="whisper-1"`, `outputTokens=3`, `totalTokens=3`
- WHEN the migration completes
- THEN the row has `kind="audio"`, `units=3`, `outputTokens=0`, `totalTokens=0`
- AND `costUsd` is unchanged

#### Scenario: Image model rows migrate to kind=image

- GIVEN a pre-migration row with `model="imagen-4"`, `outputTokens=1`, `totalTokens=1`
- WHEN the migration completes
- THEN the row has `kind="image"`, `units=1`, `outputTokens=0`, `totalTokens=0`
- AND `costUsd` is unchanged

#### Scenario: Chat model rows take default kind

- GIVEN a pre-migration row with `model="claude-haiku"`, `inputTokens=1200`, `outputTokens=400`
- WHEN the migration completes
- THEN the row has `kind="chat"` (column default), `units=0`, `cacheReadTokens=0`, `cacheWriteTokens=0`
- AND `inputTokens / outputTokens / totalTokens / costUsd` are unchanged

### Requirement: Estimator Scope And Labelling

The character-based `estimateTokens` heuristic SHALL be used ONLY for cases where the actual provider-reported token count is not yet available, specifically:

- compaction decision (`shouldCompact`, `trimMessagesToFit`)
- attachment size classification (`classifyAttachmentSize`)
- attachment content truncation (`truncateHead`, `truncateCsvSmart`)

When such an estimated value is shown in the UI, it SHALL be visually marked as approximate (prefix `≈` or the word `預估` / "estimated"). The system MUST NOT display estimated counts where a persisted `TokenUsage` value is already available.

#### Scenario: Compaction uses estimator

- GIVEN a chat request is about to be sent and no API usage is known yet
- WHEN the route decides whether to compact
- THEN it calls `estimateMessagesTokens(messages) + overhead` and compares against `MODEL_CONTEXT_LIMITS[model] * 0.7`

#### Scenario: Attachment warning labels as estimate

- GIVEN a user uploads a 12k-token text file
- WHEN the UI shows the size warning
- THEN the number is shown as `≈12,000 tokens` or `預估 12,000 tokens`, not as `12,000 tokens`

#### Scenario: Admin views actual count after the fact

- GIVEN an assistant message that has been completed and `TokenUsage` written
- WHEN the admin opens the conversation viewer
- THEN the displayed token count comes from `TokenUsage.totalTokens` (the actual value), with no `≈` prefix

