# Tool Specification Deltas

## ADDED Requirements

### Requirement: 程式碼版本快照
The system SHALL automatically snapshot a tool's code before each update made via AI tools, and retain the most recent 20 snapshots per tool.

#### Scenario: 更新時快照舊 code
- GIVEN a tool with existing `code`
- WHEN either `updateCode` or `editCode` tool runs and produces a new `code` different from the current value
- THEN the current `code` is written to `ToolCodeSnapshot` with the update's `explanation`
- AND the tool's `code` is updated to the new value
- AND both operations happen in a single transaction

#### Scenario: 相同 code 不產生重複快照
- GIVEN a tool with existing `code`
- WHEN an update is requested with the **same** `code`
- THEN no new `ToolCodeSnapshot` is created
- AND the tool's `code` remains unchanged

#### Scenario: 超過保留上限自動清舊
- GIVEN a tool already has 20 snapshots
- WHEN a new snapshot is written
- THEN the oldest snapshot is removed so that exactly 20 remain
- AND the cleanup happens in the same transaction as the write

#### Scenario: 工具刪除時快照一併刪除
- GIVEN a tool has `ToolCodeSnapshot` rows
- WHEN the tool is deleted
- THEN all related snapshots are removed (ON DELETE CASCADE)

### Requirement: 版本歷史檢視與還原
The system SHALL allow tool authors to browse snapshots and restore the tool to any retained snapshot.

#### Scenario: 列出版本歷史
- GIVEN a logged-in user who is the author of the tool
- WHEN GET `/api/tools/[id]/snapshots`
- THEN the response contains up to 20 snapshots with `{ id, explanation, createdAt }` sorted by `createdAt` descending
- AND the full `code` field is NOT returned in the list response

#### Scenario: 非作者無法存取
- GIVEN a logged-in user who does not own the tool
- WHEN GET `/api/tools/[id]/snapshots`
- THEN the response is 403

#### Scenario: 還原至歷史版本
- GIVEN tool `T` has snapshot `S` with `code = X`
- AND the current `T.code = Y` (X ≠ Y)
- WHEN POST `/api/tools/[id]/snapshots/[snapshotId]/restore`
- THEN the current code `Y` is snapshotted first
- AND `T.code` is set to `X`
- AND the response is the updated tool

#### Scenario: 還原動作本身也可被還原
- GIVEN the user restored the tool once
- WHEN they list snapshots again
- THEN the code that existed just before the restore appears as a new snapshot
- AND it can be restored too
