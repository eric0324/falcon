# audio-transcription Spec Delta: unify-token-usage-tracking

調整現有 Billing 需求，讓 audio row 改用 `kind="audio"` 與 `units` 欄位，不再把分鐘數塞進 `outputTokens`。

## MODIFIED Requirements

### Requirement: Billing

The system SHALL record audio transcription usage in `TokenUsage` so it counts toward the user's monthly quota, using the unified usage-tracking schema (`kind="audio"`, `units = minutes`).

#### Scenario: Successful transcription writes TokenUsage with kind=audio

- GIVEN a transcription succeeds and reports `durationSec = 75` (rounds up to 2 minutes)
- WHEN the system writes the usage row
- THEN `kind = "audio"`, `model = "gpt-4o-mini-transcribe"`, `units = 2`
- AND `inputTokens = 0`, `outputTokens = 0`, `totalTokens = 0`
- AND `costUsd = audioPricing["gpt-4o-mini-transcribe"] * 2 = 0.006`

#### Scenario: Failed transcription does not write usage

- GIVEN transcription throws
- WHEN the caller handles the error
- THEN no `TokenUsage` row is created
- AND the user's quota is not charged

#### Scenario: Quota query includes audio cost

- GIVEN the user accumulated 4 minutes of `gpt-4o-mini-transcribe` (`costUsd = 0.012`) in the current month
- WHEN `getMonthlyUsage(userId)` runs
- THEN the result includes that `0.012` as part of the total
- AND audio cost is treated identically to chat cost for quota purposes
